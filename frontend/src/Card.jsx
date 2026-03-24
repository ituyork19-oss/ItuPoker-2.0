import React from 'react';

// Maps backend string like '2s', 'Ts', 'Ah' to display formats
const suitMap = {
    's': { symbol: '♠', color: 'black' },
    'c': { symbol: '♣', color: 'black' },
    'h': { symbol: '♥', color: 'red' },
    'd': { symbol: '♦', color: 'red' }
};

export default function Card({ value }) {
    if (!value) return <div className="playing-card back"></div>;

    const rank = value.charAt(0);
    const suit = value.charAt(1);

    // Convert 'T' to '10' for display
    const displayRank = rank === 'T' ? '10' : rank;
    const { symbol, color } = suitMap[suit.toLowerCase()] || { symbol: '?', color: 'black' };

    return (
        <div className={`playing-card animate-slide-up ${color}`} style={{ flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 2, left: 4, fontSize: '0.9rem' }}>
                {displayRank}
            </div>
            <div style={{ fontSize: '1.8rem' }}>
                {symbol}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '0.9rem', transform: 'rotate(180deg)' }}>
                {displayRank}
            </div>
        </div>
    );
}
