import { clsx } from "clsx";

/**
 * SeriesBadge - displays a styled badge for the influencer's series/category
 * 
 * @param {Object} props
 * @param {string|null} props.series - The series value (Elite, A2, A3, Institucional, Cortes, Noticias)
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.className - Additional CSS classes
 */

// Mapping of series values to display labels and colors
const SERIES_CONFIG = {
    Elite: {
        label: "Elite",
        bgColor: "bg-amber-500/20",
        textColor: "text-amber-400",
        borderColor: "border-amber-500/50",
    },
    A2: {
        label: "Série B",
        bgColor: "bg-blue-500/20",
        textColor: "text-blue-400",
        borderColor: "border-blue-500/50",
    },
    A3: {
        label: "Série C",
        bgColor: "bg-cyan-500/20",
        textColor: "text-cyan-400",
        borderColor: "border-cyan-500/50",
    },
    Institucional: {
        label: "Institucional",
        bgColor: "bg-purple-500/20",
        textColor: "text-purple-400",
        borderColor: "border-purple-500/50",
    },
    Cortes: {
        label: "Cortes",
        bgColor: "bg-rose-500/20",
        textColor: "text-rose-400",
        borderColor: "border-rose-500/50",
    },
    Noticias: {
        label: "Notícias",
        bgColor: "bg-emerald-500/20",
        textColor: "text-emerald-400",
        borderColor: "border-emerald-500/50",
    },
};

const SIZE_CLASSES = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
};

export default function SeriesBadge({ series, size = "md", className = "" }) {
    if (!series) {
        return null;
    }

    const config = SERIES_CONFIG[series];
    if (!config) {
        return null;
    }

    return (
        <span
            className={clsx(
                "inline-flex items-center font-medium rounded-full border",
                config.bgColor,
                config.textColor,
                config.borderColor,
                SIZE_CLASSES[size] || SIZE_CLASSES.md,
                className
            )}
        >
            {config.label}
        </span>
    );
}

// Export the options for use in dropdowns
export const SERIES_OPTIONS = [
    { value: "", label: "Todas as Séries" },
    { value: "Elite", label: "Elite" },
    { value: "A2", label: "Série B" },
    { value: "A3", label: "Série C" },
    { value: "Institucional", label: "Institucional" },
    { value: "Cortes", label: "Cortes" },
    { value: "Noticias", label: "Notícias" },
];
