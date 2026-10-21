import React from 'react';

export const Footer = () => {
  return (
    <footer className="py-6 mt-12 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
      <p>© {new Date().getFullYear()} VeriSync. All rights reserved.</p>
    </footer>
  );
};
export default Footer;
