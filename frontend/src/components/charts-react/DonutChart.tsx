import { motion } from 'framer-motion';

interface DataPoint {
    label: string;
    value: number;
}

interface Props {
    data: DataPoint[];
    title: string;
}

const colors = [
    'var(--color-header)',
    '#a8a29e',
    'var(--color-accent)',
    '#78716c',
    '#d6d3d1',
    '#57534e',
    '#e7e5e4',
];

export default function DonutChart({ data, title }: Props) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = 60;

    // Calculate segments using pathLength=100 for simpler math
    let cumulativePercent = 0;
    const segments = data.slice(0, 7).map((item, i) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0;
        const offset = cumulativePercent;
        cumulativePercent += percent;

        return {
            item,
            color: colors[i % colors.length],
            offset,
            length: percent,
        };
    });

    return (
        <div className="chart-card bg-[var(--color-accent)]/5 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="relative">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                        {segments.map((seg, i) => (
                            <motion.circle
                                key={seg.item.label}
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="20"
                                pathLength={100}
                                transform="rotate(-90 80 80)"
                                style={{
                                    strokeDashoffset: -seg.offset,
                                }}
                                initial={{
                                    strokeDasharray: `0 100`,
                                }}
                                animate={{
                                    strokeDasharray: `${seg.length} ${100 - seg.length}`,
                                }}
                                transition={{
                                    duration: 0.8,
                                    ease: [0.4, 0, 0.2, 1],
                                    delay: i * 0.1,
                                }}
                            />
                        ))}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <motion.span
                            className="text-2xl font-bold"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            {total}
                        </motion.span>
                        <span className="text-xs opacity-70">total</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 text-sm">
                    {data.slice(0, 12).map((item, i) => (
                        <motion.div
                            key={item.label}
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                        >
                            <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: colors[i % colors.length] }}
                            />
                            <span>{item.label}</span>
                            <span className="opacity-70">({item.value})</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
