import React, { useState } from 'react';

const LineChart = ({
  data = [],
  title = '',
  height = 240,
  dataKey = 'value',
  labelKey = 'label',
  lineColor = '#06b6d4', // cyan-500
  fillGradient = true,
  emptyText = 'कोणतीही माहिती उपलब्ध नाही (No Data Available)'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500 text-xs">
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
          <h4 className="font-semibold text-slate-200">{title}</h4>
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id={`grad-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
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
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="8"
                >
                  ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {fillGradient && (
            <path
              d={areaD}
              fill={`url(#grad-${lineColor.replace('#', '')})`}
            />
          )}

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Interactive Nodes */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? '#ffffff' : lineColor}
                  stroke={isHovered ? lineColor : '#0f172a'}
                  strokeWidth="2"
                  className="transition-all duration-200"
                />

                {/* X-axis Label */}
                <text
                  x={p.x}
                  y={paddingTop + chartHeight + 16}
                  textAnchor="middle"
                  fill={isHovered ? '#f8fafc' : '#94a3b8'}
                  fontSize="8.5"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {p.data[labelKey] || p.data.monthNameMarathi || p.data.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="absolute top-2 right-2 bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-0.5 pointer-events-none z-10">
            <p className="font-bold text-slate-200">
              {data[hoveredIdx][labelKey] || data[hoveredIdx].monthNameMarathi}
            </p>
            <p className="font-mono text-cyan-400 font-bold">
              ₹{Number(data[hoveredIdx][dataKey] || 0).toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChart;
