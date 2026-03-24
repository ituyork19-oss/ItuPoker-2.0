import React from 'react';

const BrandingTitle = ({ text = "ItuPoker", className = "" }) => {
    return (
        <div className={`branding-title ${className}`}>
            {text.split('').map((char, index) => (
                <span
                    key={index}
                    className="branding-letter"
                    style={{
                        animationDelay: `${index * 0.1}s`,
                        color: index < 3 ? 'var(--accent-neon-blue)' : 'white'
                    }}
                >
                    {char}
                </span>
            ))}
        </div>
    );
};

export default BrandingTitle;
