import React, { useState } from 'react';

const BarChart = ({
  data = [],
  title = '',
  height = 240,
  bar1Key = 'value1',
  bar2Key = 'value2',
  bar1Name = 'Billed Amount',
  bar2Name = 'Collected Amount',
  bar1Color = '#f97316', // orange-500
  bar2Color = '#10b981', // emerald-500
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

  const maxValue = Math.max(
    ...data.map(d => Math.max(Number(d[bar1Key] || 0), Number(d[bar2Key] || 0))),
    100
  );

  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;
  const svgWidth = 600;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.max(Math.min(groupWidth * 0.35, 18), 6);

  // Y-axis grid ticks (4 divisions)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(maxValue * ratio));

  return (
    <div className="w-full space-y-3">
      {/* Title & Legend */}
      <div className="flex items-center justify-between text-xs pb-1">
        {title && <h4 className="font-bold text-slate-900">{title}</h4>}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: bar1Color }}
            />
            <span className="text-slate-600">{bar1Name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: bar2Color }}
            />
            <span className="text-slate-600">{bar2Name}</span>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Y-axis grid lines */}
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
                  ₹{val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, i) => {
            const groupX = paddingLeft + i * groupWidth + (groupWidth - barWidth * 2 - 4) / 2;
            const val1 = Number(item[bar1Key] || 0);
            const val2 = Number(item[bar2Key] || 0);

            const bar1Height = (val1 / maxValue) * chartHeight;
            const bar2Height = (val2 / maxValue) * chartHeight;

            const y1 = paddingTop + chartHeight - bar1Height;
            const y2 = paddingTop + chartHeight - bar2Height;

            const isHovered = hoveredIdx === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Hover backdrop */}
                {isHovered && (
                  <rect
                    x={paddingLeft + i * groupWidth}
                    y={paddingTop}
                    width={groupWidth}
                    height={chartHeight}
                    fill="#f1f5f9"
                    rx="4"
                  />
                )}

                {/* Bar 1 */}
                <rect
                  x={groupX}
                  y={y1}
                  width={barWidth}
                  height={Math.max(bar1Height, 2)}
                  fill={bar1Color}
                  rx="2"
                  className="transition-all duration-300"
                />

                {/* Bar 2 */}
                <rect
                  x={groupX + barWidth + 4}
                  y={y2}
                  width={barWidth}
                  height={Math.max(bar2Height, 2)}
                  fill={bar2Color}
                  rx="2"
                  className="transition-all duration-300"
                />

                {/* X-axis label */}
                <text
                  x={groupX + barWidth + 2}
                  y={height - 10}
                  textAnchor="middle"
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  fontSize="9"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {item.label || item.month || `M${i + 1}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-[11px] shadow-xl pointer-events-none z-10 space-y-0.5"
          >
            <div className="font-bold text-slate-300">
              {data[hoveredIdx].label || `Month ${hoveredIdx + 1}`}
            </div>
            <div className="text-orange-400">
              {bar1Name}: ₹{Number(data[hoveredIdx][bar1Key] || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-emerald-400">
              {bar2Name}: ₹{Number(data[hoveredIdx][bar2Key] || 0).toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarChart;
