import React, { useState } from 'react';

const LineChart = ({
  data = [],
  title = '',
  height = 240,
  dataKey = 'value',
  labelKey = 'label',
  lineColor = '#0284c7', // sky-600
  fillGradient = true,
  emptyText = 'No data available'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
        <span>{emptyText}</span>
      </div>
    );
  }

  const values = data.map(d => Number(d[dataKey] || 0));
  const maxValue = Math.max(...values, 100);

  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const svgWidth = 600;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartHeight - (Number(d[dataKey] || 0) / maxValue) * chartHeight;
    return { x, y, data: d, index: i };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(maxValue * ratio));

  return (
    <div className="w-full space-y-3">
      {title && (
        <div className="flex items-center justify-between text-xs pb-1">
          <h4 className="font-bold text-slate-900">{title}</h4>
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id={`grad-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((val, i) => {
            const y = paddingTop + chartHeight - (val / maxValue) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="8"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {fillGradient && areaD && (
            <path
              d={areaD}
              fill={`url(#grad-${lineColor.replace('#', '')})`}
            />
          )}

          {/* Line Stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((p, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke={lineColor}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                />

                {/* X-axis label */}
                <text
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  fontSize="9"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {p.data[labelKey] || `M${i + 1}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1 text-[11px] shadow-xl pointer-events-none z-10"
          >
            <span className="font-bold text-slate-300">
              {points[hoveredIdx].data[labelKey]}:{' '}
            </span>
            <span className="text-cyan-400 font-bold">
              {points[hoveredIdx].data[dataKey]}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChart;
