import React from 'react';

export interface PillTabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  accentColor?: string;
  hoverCircleColor?: string;
}

interface SellerPillNavProps {
  items: PillTabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  ease?: string;
}

const SellerPillNav: React.FC<SellerPillNavProps> = ({
  items,
  activeKey,
  onSelect,
}) => {
  return (
    <div className="relative border-b border-gray-100 bg-[#fafafa]">
      <div className="relative flex gap-2 p-2.5 overflow-x-auto seller-pill-scrollbar">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          const accent = item.accentColor || '#E23744';

          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className="group relative overflow-hidden shrink-0 inline-flex items-center justify-center rounded-full cursor-pointer select-none transition-all duration-300"
              style={{
                height: 38,
                paddingLeft: 18,
                paddingRight: 18,
                background: isActive ? accent : '#eeedf0',
                color: isActive ? '#ffffff' : '#4a4458',
                boxShadow: isActive ? `0 4px 14px ${accent}40` : 'none',
              }}
              aria-label={item.label}
            >
              {/* Subtle hover background effect for inactive tabs */}
              {!isActive && (
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ backgroundColor: accent }}
                />
              )}

              {/* Label */}
              <span className="relative z-10 flex items-center gap-2 text-sm font-semibold tracking-wide">
                <span className={`flex items-center transition-transform duration-300 ${!isActive && 'group-hover:scale-110'}`}>
                    {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Indicator Line */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-transparent">
         {/* We can omit the sliding line if the pills themselves are clearly active, or keep a simple static line under the container */}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .seller-pill-scrollbar::-webkit-scrollbar {
          height: 0;
          display: none;
        }
        .seller-pill-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};

export default SellerPillNav;
