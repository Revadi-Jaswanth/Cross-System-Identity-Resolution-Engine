import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import IdentityAddressForm from './IdentityAddressForm';
import IdentityIdentifiersForm from './IdentityIdentifiersForm';
import ValidationSummary from './ValidationSummary';
import { 
  CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Save, 
  HelpCircle, Clipboard, ClipboardCheck, Info
} from 'lucide-react';

const identitySchema = z.object({
  system_source: z.string().min(1, { message: 'Source System is required.' }),
  system_uid: z.string().min(1, { message: 'Source Record UID is required.' }),
  organization_id: z.number().min(1, { message: 'Organization Scope is required.' }),
  
  // Demographics
  name: z.string().min(3, { message: 'Full name must be at least 3 characters.' }),
  dob: z.string().min(1, { message: 'Date of Birth is required.' }),
  gender: z.string().min(1, { message: 'Gender selection is required.' }),
  
  // Address
  address: z.string().min(1, { message: 'Street Address is required.' }),
  city: z.string().min(1, { message: 'City is required.' }),
  state: z.string().min(1, { message: 'State is required.' }),
  postal_code: z.string().min(6, { message: 'Postal Code must be at least 6 characters.' }),
  
  // Identifiers
  aadhaar: z.string().length(12, { message: 'Aadhaar must be exactly 12 digits.' }).optional().or(z.literal('')),
  abha: z.string().optional(),
  digilocker: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal(''))
});

export const IdentityForm = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [copiedField, setCopiedField] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [isDirtyState, setIsDirtyState] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isDirty },
    setValue,
    reset
  } = useForm({
    resolver: zodResolver(identitySchema),
    mode: 'onChange',
    defaultValues: {
      system_source: '',
      system_uid: '',
      organization_id: 1,
      name: '',
      dob: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      aadhaar: '',
      abha: '',
      digilocker: '',
      mobile: '',
      email: ''
    }
  });

  const formValues = watch();
  const sourceSystem = watch('system_source');

  // Track dirty state for unsaved changes warning
  useEffect(() => {
    setIsDirtyState(isDirty);
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Do you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Debounced Autosave (500ms)
  useEffect(() => {
    if (!isDirty) return;
    const delayDebounceFn = setTimeout(() => {
      const draftObj = {
        values: formValues,
        timestamp: Date.now()
      };
      localStorage.setItem('identity_registration_draft', JSON.stringify(draftObj));
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formValues, isDirty]);

  // Check for existing draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('identity_registration_draft');
    if (savedDraft) {
      try {
        const { values } = JSON.parse(savedDraft);
        reset(values);
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 3000);
      } catch (e) {
        // Corrupted draft, ignore
      }
    }
  }, [reset]);

  const ingestMutation = useMutation({
    mutationFn: (payload) => api.post('/v1/identities/ingest', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['identities']);
      localStorage.removeItem('identity_registration_draft');
      reset();
      if (onSuccess) onSuccess();
    }
  });

  const handleNextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) {
      fieldsToValidate = ['system_source', 'system_uid', 'organization_id', 'name', 'dob', 'gender'];
    } else if (step === 2) {
      fieldsToValidate = ['address', 'city', 'state', 'postal_code'];
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const copyToClipboard = (field, text) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const onSubmitForm = (data) => {
    const payload = {
      system_source: data.system_source,
      system_uid: data.system_uid,
      organization_id: data.organization_id,
      attributes: {
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        address: `${data.address}, ${data.city}, ${data.state} - ${data.postal_code}`,
        aadhaar: data.aadhaar || null,
        abha: data.abha || null,
        digilocker: data.digilocker || null,
        mobile: data.mobile || null,
        email: data.email || null
      }
    };
    ingestMutation.mutate(payload);
  };

  const manualSaveDraft = () => {
    const draftObj = {
      values: formValues,
      timestamp: Date.now()
    };
    localStorage.setItem('identity_registration_draft', JSON.stringify(draftObj));
    alert('Draft saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Draft restored indicator */}
      {draftRestored && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-premium text-xs font-semibold flex items-center gap-2">
          <Info size={16} />
          <span>Draft restored successfully from your previous session!</span>
        </div>
      )}

      {/* Progress indicators bar */}
      <div className="flex items-center justify-between border-b pb-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
        <span>Step {step} of 4</span>
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={manualSaveDraft} 
            className="flex items-center gap-1.5 hover:text-primary-700 transition-colors text-primary-600 font-bold"
          >
            <Save size={14} />
            <span>Save Draft</span>
          </button>
          <span>Progress: {Math.round((step / 4) * 100)}%</span>
        </div>
      </div>

      {/* Steps indicators navigation */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 p-3 rounded-premium text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
        <span className={step === 1 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}>1. Source Info</span>
        <span>&rarr;</span>
        <span className={step === 2 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}>2. Address</span>
        <span>&rarr;</span>
        <span className={step === 3 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}>3. Identifiers</span>
        <span>&rarr;</span>
        <span className={step === 4 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}>4. Review</span>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 mb-4">
              System Source & Personal Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Source System *</label>
                <select {...register('system_source')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-700">
                  <option value="">Select system</option>
                  <option value="AadhaarService">AadhaarService</option>
                  <option value="ABHAService">ABHAService</option>
                  <option value="DigiLockerService">DigiLockerService</option>
                </select>
                {errors.system_source && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.system_source.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Source Record ID *</label>
                <input type="text" {...register('system_uid')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" placeholder="e.g. REC-102" />
                {errors.system_uid && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.system_uid.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Organization ID *</label>
                <input type="number" {...register('organization_id', { valueAsNumber: true })} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" placeholder="e.g. 1" />
                {errors.organization_id && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.organization_id.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Full Name *</label>
                <input type="text" {...register('name')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" placeholder="Rajesh Kumar" />
                {errors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Gender *</label>
                <select {...register('gender')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-700">
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
                {errors.gender && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.gender.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Date of Birth *</label>
              <input type="date" {...register('dob')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-700" />
              {errors.dob && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.dob.message}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <IdentityAddressForm register={register} errors={errors} />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <IdentityIdentifiersForm register={register} errors={errors} />
            
            {/* Dynamic input rendering base on source system */}
            {sourceSystem === 'AadhaarService' && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-premium text-xs font-semibold">
                Source System is set to Aadhaar: Aadhaar ID is mandatory for exact hash lookup verification.
              </div>
            )}

            <ValidationSummary errors={errors} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 mb-4">
              Review Registration Preview
            </h3>
            
            <div className="bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-premium p-6 space-y-4 text-sm text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">Source System</span>
                  <span className="font-bold">{formValues.system_source}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">Source UID</span>
                  <span className="font-bold">{formValues.system_uid}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">Full Name</span>
                  <span className="font-bold">{formValues.name}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">DOB</span>
                  <span className="font-bold">{formValues.dob}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <span className="block text-xs text-slate-400 font-semibold uppercase">Residential Address</span>
                <span className="font-bold">{formValues.address}, {formValues.city}, {formValues.state} - {formValues.postal_code}</span>
              </div>

              {formValues.aadhaar && (
                <div className="border-t pt-4 flex justify-between items-center">
                  <div>
                    <span className="block text-xs text-slate-400 font-semibold uppercase">Aadhaar (Masked)</span>
                    <span className="font-bold font-mono">********{formValues.aadhaar.slice(-4)}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard('aadhaar', formValues.aadhaar)}
                    className="p-1.5 border rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    {copiedField === 'aadhaar' ? <ClipboardCheck size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons Panel */}
        <div className="flex justify-between border-t pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-premium text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors"
            >
              <span>Next Step</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={ingestMutation.isLoading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors"
            >
              {ingestMutation.isLoading ? 'Ingesting Record...' : 'Confirm Ingestion'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
export default IdentityForm;
