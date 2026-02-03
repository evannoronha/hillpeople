import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GradeData {
    grade: string;
    count: number;
}

interface GradePyramidData {
    all: GradeData[];
    leads: GradeData[];
    redpoints: GradeData[];
}

interface Props {
    data: GradePyramidData;
}

const colors = [
    'var(--color-header)',
    '#d77a40',
    '#b5855a',
    '#8a8a6c',
    'var(--color-accent)',
];

const modeConfig = {
    redpoints: { label: 'Hardo', tooltip: 'Lead, no falls' },
    leads: { label: 'Normal', tooltip: 'All lead climbs' },
    allRoutes: { label: 'Top Rope Tough Guy', tooltip: 'All routes including TR' },
} as const;

type Mode = keyof typeof modeConfig;

export default function GradePyramid({ data }: Props) {
    const [mode, setMode] = useState<Mode>('redpoints');
    const [hoveredButton, setHoveredButton] = useState<Mode | null>(null);

    const modes = {
        redpoints: data.redpoints,
        leads: data.leads,
        allRoutes: data.all,
    };

    const currentData = modes[mode].slice(0, 15);
    const maxValue = Math.max(...currentData.map(d => d.count), 1);

    return (
        <div className="pyramid-container">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold">Grade Pyramid</h3>
                <div className="flex gap-1 text-xs" role="group" aria-label="Grade pyramid filter">
                    {(Object.keys(modeConfig) as Mode[]).map((m) => (
                        <div
                            key={m}
                            className="relative"
                            onMouseEnter={() => setHoveredButton(m)}
                            onMouseLeave={() => setHoveredButton(null)}
                        >
                            <button
                                type="button"
                                className={`pyramid-mode-btn px-2 py-1 rounded transition-colors ${
                                    mode === m ? 'active' : ''
                                }`}
                                onClick={() => setMode(m)}
                                aria-pressed={mode === m}
                            >
                                {modeConfig[m].label}
                            </button>
                            <AnimatePresence>
                                {hoveredButton === m && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-text)] text-[var(--color-bg)] text-xs rounded-md whitespace-nowrap z-50 pointer-events-none"
                                    >
                                        {modeConfig[m].tooltip}
                                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[var(--color-text)]" />
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2 max-w-[400px] mx-auto">
                <AnimatePresence mode="popLayout">
                    {currentData.map((item, i) => {
                        const widthPercent = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
                        const color = colors[i % colors.length];

                        return (
                            <motion.div
                                key={item.grade}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{
                                    layout: { duration: 0.3, ease: 'easeInOut' },
                                    opacity: { duration: 0.2 },
                                    x: { duration: 0.2 },
                                }}
                                className="flex items-center w-full gap-2 group cursor-pointer"
                            >
                                <span className="w-12 text-right text-sm font-mono opacity-80 shrink-0">
                                    {item.grade}
                                </span>
                                <div className="flex-1 h-6 flex items-center gap-2">
                                    <motion.div
                                        className="h-full rounded-r group-hover:opacity-80"
                                        style={{ backgroundColor: color, minWidth: 4 }}
                                        initial={{ width: '2%' }}
                                        animate={{ width: `${Math.max(widthPercent, 2)}%` }}
                                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                    />
                                    {item.count > 0 && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.7 }}
                                            className="text-xs font-medium shrink-0"
                                        >
                                            {item.count}
                                        </motion.span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {currentData.length === 0 && (
                <div className="text-center opacity-60 py-4">
                    No grade data available
                </div>
            )}
        </div>
    );
}
