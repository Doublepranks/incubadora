import React, { Suspense, lazy } from 'react';

const ReactApexChart = lazy(() => import('react-apexcharts'));

const LazyChart = (props) => {
  return (
    <Suspense
      fallback={
        <div className="w-full h-48 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Carregando gráfico...
        </div>
      }
    >
      <ReactApexChart {...props} />
    </Suspense>
  );
};

export default LazyChart;
