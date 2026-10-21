import React from 'react';
import { vi } from 'vitest';

// Mock canvas getContext for Chart.js in jsdom environment
HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: (x, y, w, h) => ({ data: new Array(w * h * 4).fill(0) }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  };
};

// Mock chart.js module with explicit named exports classes
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  registerables: [],
  CategoryScale: class {},
  LinearScale: class {},
  PointElement: class {},
  LineElement: class {},
  BarElement: class {},
  ArcElement: class {},
  Title: class {},
  Tooltip: class {},
  Legend: class {},
}));

// Mock react-chartjs-2 using React.createElement
vi.mock('react-chartjs-2', () => ({
  Line: () => React.createElement('div', null, 'Line Chart Mock'),
  Bar: () => React.createElement('div', null, 'Bar Chart Mock'),
  Doughnut: () => React.createElement('div', null, 'Doughnut Chart Mock'),
  Pie: () => React.createElement('div', null, 'Pie Chart Mock'),
}));
