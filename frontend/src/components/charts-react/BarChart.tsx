import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityData {
    label: string;
    climbs: number;
    pitches: number;
}

interface Props {
    data: ActivityData[];
    title: string;
}

type Mode = 'pitches' | 'climbs';

export default function BarChart({ data, title }: Props) {
    const [mode, setMode] = useState<Mode>('pitches');
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);

    const maxValue = Math.max(...data.map(d => d[mode]), 1);
    const barColor = 'var(--color-header)';

    return (
        <div className="chart-card bg-[var(--color-accent)]/5 rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="flex gap-1 text-xs">
                    <button
                        type="button"
                        className={`bar-toggle-btn px-2 py-1 rounded transition-colors ${
                            mode === 'pitches' ? 'active' : ''
                        }`}
                        onClick={() => setMode('pitches')}
                    >
                        Pitches
                    </button>
                    <button
                        type="button"
                        className={`bar-toggle-btn px-2 py-1 rounded transition-colors ${
                            mode === 'climbs' ? 'active' : ''
                        }`}
                        onClick={() => setMode('climbs')}
                    >
                        Climbs
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[220px] relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pb-[30px] pointer-events-none opacity-30">
                    <div className="border-b border-current" />
                    <div className="border-b border-current" />
                    <div className="border-b border-current" />
                </div>

                {/* Bars */}
                <div className="absolute top-0 left-0 right-0 bottom-[30px] flex gap-1">
                    <AnimatePresence mode="wait">
                        {data.map((point, i) => {
                            const value = point[mode];
                            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

                            return (
                                <div
                                    key={point.label}
                                    className="flex-1 flex items-end relative"
                                    onMouseEnter={() => setHoveredBar(i)}
                                    onMouseLeave={() => setHoveredBar(null)}
                                >
                                    <motion.div
                                        className="w-full rounded-t cursor-pointer"
                                        style={{
                                            backgroundColor: barColor,
                                            minHeight: 4,
                                        }}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.max(heightPercent, 2)}%` }}
                                        transition={{
                                            duration: 0.5,
                                            ease: [0.4, 0, 0.2, 1],
                                            delay: i * 0.03,
                                        }}
                                    />

                                    {/* Tooltip */}
                                    <AnimatePresence>
                                        {hoveredBar === i && (
                                            <motion.span
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50"
                                            >
                                                {value} {mode}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex">
                    {data.map((point) => (
                        <span
                            key={point.label}
                            className="flex-1 text-center text-xs opacity-70"
                        >
                            {point.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
