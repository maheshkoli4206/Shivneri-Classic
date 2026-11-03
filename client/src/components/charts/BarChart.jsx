import React, { useState } from 'react';

const BarChart = ({
  data = [],
  title = '',
  height = 240,
  bar1Key = 'value1',
  bar2Key = 'value2',
  bar1Name = 'मालमत्ता / आकारणी',
  bar2Name = 'वसुली / जमा',
  bar1Color = '#f97316', // orange-500
  bar2Color = '#10b981', // emerald-500
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
        {title && <h4 className="font-semibold text-slate-200">{title}</h4>}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: bar1Color }} />
            <span className="text-slate-400">{bar1Name}</span>
          </div>
          {bar2Key && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: bar2Color }} />
              <span className="text-slate-400">{bar2Name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Horizontal Grid lines */}
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
                  fontFamily="sans-serif"
                >
                  ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars */}
          {data.map((item, idx) => {
            const groupCenterX = paddingLeft + (idx + 0.5) * groupWidth;
            const val1 = Number(item[bar1Key] || 0);
            const val2 = bar2Key ? Number(item[bar2Key] || 0) : 0;

            const bar1Height = (val1 / maxValue) * chartHeight;
            const bar2Height = (val2 / maxValue) * chartHeight;

            const bar1X = bar2Key ? groupCenterX - barWidth - 1 : groupCenterX - barWidth / 2;
            const bar2X = groupCenterX + 1;

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Background hover column */}
                {isHovered && (
                  <rect
                    x={paddingLeft + idx * groupWidth}
                    y={paddingTop}
                    width={groupWidth}
                    height={chartHeight}
                    fill="#334155"
                    fillOpacity="0.2"
                    rx="4"
                  />
                )}

                {/* Bar 1 */}
                <rect
                  x={bar1X}
                  y={paddingTop + chartHeight - bar1Height}
                  width={barWidth}
                  height={Math.max(bar1Height, 0)}
                  fill={bar1Color}
                  rx="3"
                  className="transition-all duration-300"
                />

                {/* Bar 2 (if present) */}
                {bar2Key && (
                  <rect
                    x={bar2X}
                    y={paddingTop + chartHeight - bar2Height}
                    width={barWidth}
                    height={Math.max(bar2Height, 0)}
                    fill={bar2Color}
                    rx="3"
                    className="transition-all duration-300"
                  />
                )}

                {/* X-axis Label */}
                <text
                  x={groupCenterX}
                  y={paddingTop + chartHeight + 16}
                  textAnchor="middle"
                  fill={isHovered ? '#f8fafc' : '#94a3b8'}
                  fontSize="8.5"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {item.label || item.monthNameMarathi || item.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="absolute top-2 right-2 bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1 pointer-events-none z-10">
            <p className="font-bold text-slate-200">
              {data[hoveredIdx].monthNameMarathi || data[hoveredIdx].label}
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bar1Color }} />
              <span className="text-slate-400">{bar1Name}:</span>
              <span className="font-mono font-bold text-slate-100">
                ₹{Number(data[hoveredIdx][bar1Key] || 0).toLocaleString('en-IN')}
              </span>
            </div>
            {bar2Key && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bar2Color }} />
                <span className="text-slate-400">{bar2Name}:</span>
                <span className="font-mono font-bold text-slate-100">
                  ₹{Number(data[hoveredIdx][bar2Key] || 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarChart;
