import { useState, useEffect } from "react";

interface UserAvatarProps {
    src?: string;
    name?: string;
    className?: string;
}

const getAvatarColor = (name: string) => {
    const colors = [
        "bg-red-500 text-white",
        "bg-blue-500 text-white",
        "bg-green-500 text-white",
        "bg-yellow-600 text-white",
        "bg-purple-500 text-white",
        "bg-pink-500 text-white",
        "bg-indigo-500 text-white",
        "bg-teal-500 text-white",
        "bg-orange-500 text-white",
    ];
    if (!name) return colors[0];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
        sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
};

const UserAvatar = ({ src, name = "", className = "h-8 w-8" }: UserAvatarProps) => {
    const [hasError, setHasError] = useState(false);

    // Reset error state if image source changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const firstLetter = name.trim() ? name.trim().charAt(0).toUpperCase() : "?";

    if (src && !hasError) {
        return (
            <img
                src={src}
                alt={name}
                referrerPolicy="no-referrer"
                onError={() => {
                    console.warn(`Failed to load avatar for user "${name}", falling back to letter.`);
                    setHasError(true);
                }}
                className={`rounded-full object-cover ${className}`}
            />
        );
    }

    const colorClass = getAvatarColor(name);

    return (
        <div
            className={`flex items-center justify-center rounded-full font-bold uppercase select-none ${colorClass} ${className}`}
            title={name}
        >
            {firstLetter}
        </div>
    );
};

export default UserAvatar;
