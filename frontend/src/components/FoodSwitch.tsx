import React from 'react';

interface FoodSwitchProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}

const FoodSwitch: React.FC<FoodSwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <div className={`food-switch-wrapper ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <label className="switch-food" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input 
            type="checkbox" 
            className="switch-input" 
            checked={checked}
            onChange={onChange}
            disabled={disabled}
        />
        <div className="switch-track">
          <div className="switch-knob">
            <div className="burger-container">
              <div className="bun-top"><div className="seeds" /></div>
              <div className="lettuce" />
              <div className="patty" />
              <div className="bun-bottom" />
            </div>
            <div className="fries-container">
              <div className="fry-box">
                <div className="fry f1" />
                <div className="fry f2" />
                <div className="fry f3" />
                <div className="fry f4" />
                <div className="fry f5" />
                <div className="fry f6" />
                <div className="fry f7" />
                <div className="box-face front" />
                <div className="box-face back" />
                <div className="box-face right" />
                <div className="box-face left" />
                <div className="box-face bottom" />
              </div>
            </div>
          </div>
        </div>
      </label>
      <style dangerouslySetInnerHTML={{ __html: `
        .food-switch-wrapper .switch-food {
            --w: 120px;
            --h: 50px;
            --knob-size: 40px;
            --offset: 5px;
            --bg-burger: #ffecd2;
            --bg-fries: #fff5e6;

            position: relative;
            display: inline-block;
            width: var(--w);
            height: var(--h);
        }

        .food-switch-wrapper .switch-input {
            opacity: 0;
            width: 0;
            height: 0;
            position: absolute;
        }

        /* The Background Track */
        .food-switch-wrapper .switch-track {
            position: absolute;
            inset: 0;
            background-color: var(--bg-burger);
            border: 3px solid #333;
            border-radius: 60px;
            transition: background-color 0.4s;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        /* The Moving Knob Wrapper */
        .food-switch-wrapper .switch-knob {
            position: absolute;
            top: var(--offset);
            left: var(--offset);
            width: var(--knob-size);
            height: var(--knob-size);
            transition: transform 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* 1. THE BURGER (2D DOODLE) */
        .food-switch-wrapper .burger-container {
            position: absolute;
            width: 32px;
            height: 32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: transform 0.4s ease, opacity 0.3s ease;
            z-index: 2;
        }

        .food-switch-wrapper .bun-top {
            width: 28px;
            height: 12px;
            background: #ffa64d;
            border: 2px solid #333;
            border-bottom: none;
            border-radius: 20px 20px 0 0;
            position: relative;
            z-index: 4;
        }
        .food-switch-wrapper .seeds {
            position: absolute;
            width: 2px;
            height: 2px;
            background: #333;
            top: 4px;
            left: 6px;
            box-shadow: 10px 0 #333, 5px 3px #333;
            border-radius: 50%;
        }
        .food-switch-wrapper .lettuce {
            width: 32px;
            height: 5px;
            background: #8cd65e;
            border: 2px solid #333;
            border-radius: 10px;
            margin-top: -2px;
            z-index: 3;
        }
        .food-switch-wrapper .patty {
            width: 28px;
            height: 6px;
            background: #8b4513;
            border: 2px solid #333;
            border-radius: 4px;
            margin-top: -2px;
            z-index: 2;
        }
        .food-switch-wrapper .bun-bottom {
            width: 28px;
            height: 8px;
            background: #ffa64d;
            border: 2px solid #333;
            border-radius: 0 0 10px 10px;
            margin-top: -2px;
            z-index: 1;
        }

        /* 2. THE FRIES (3D) */
        .food-switch-wrapper .fries-container {
            position: absolute;
            width: 32px;
            height: 32px;
            perspective: 600px;
            opacity: 0;
            transform: scale(0);
            transition: transform 0.4s ease, opacity 0.3s ease;
            z-index: 1;
        }

        .food-switch-wrapper .fry-box {
            width: 100%;
            height: 100%;
            position: relative;
            transform-style: preserve-3d;
            transform: rotateX(-20deg) rotateY(30deg);
        }

        .food-switch-wrapper .box-face {
            position: absolute;
            border: 2px solid #333;
            background: #ff4757;
            backface-visibility: visible;
        }
        .food-switch-wrapper .box-face.front { width: 24px; height: 28px; transform: translateZ(12px); left: 4px; top: 4px; }
        .food-switch-wrapper .box-face.back { width: 24px; height: 28px; transform: rotateY(180deg) translateZ(12px); left: 4px; top: 4px; }
        .food-switch-wrapper .box-face.right { width: 24px; height: 28px; transform: rotateY(90deg) translateZ(12px); left: 4px; top: 4px; }
        .food-switch-wrapper .box-face.left { width: 24px; height: 28px; transform: rotateY(-90deg) translateZ(12px); left: 4px; top: 4px; }
        .food-switch-wrapper .box-face.bottom { width: 24px; height: 24px; transform: rotateX(-90deg) translateZ(24px); left: 4px; }

        .food-switch-wrapper .fry {
            position: absolute;
            width: 5px;
            height: 20px;
            background: #ffd32a;
            border: 2px solid #333;
            top: -8px;
            transform-origin: bottom;
            border-radius: 2px;
        }

        .food-switch-wrapper .fry.f1 { left: 6px; transform: translateZ(8px) rotateZ(-10deg); }
        .food-switch-wrapper .fry.f2 { left: 12px; transform: translateZ(4px) rotateZ(0deg); height: 26px; top: -14px; }
        .food-switch-wrapper .fry.f3 { left: 10px; transform: translateZ(-4px) rotateZ(8deg); }
        .food-switch-wrapper .fry.f4 { left: 18px; transform: translateZ(8px) rotateZ(10deg); height: 16px; }
        .food-switch-wrapper .fry.f5 { left: 6px; transform: translateZ(-6px) rotateZ(-15deg); height: 22px; top: -10px; }
        .food-switch-wrapper .fry.f6 { left: 20px; transform: translateZ(0px) rotateZ(5deg); height: 20px; }
        .food-switch-wrapper .fry.f7 { left: 12px; transform: translateZ(10px) rotateZ(-5deg); height: 21px; top: -6px; }

        .food-switch-wrapper .switch-input:checked ~ .switch-track .switch-knob {
            transform: translateX(calc(var(--w) - var(--knob-size) - (var(--offset) * 2)));
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .food-switch-wrapper .switch-input:checked ~ .switch-track .burger-container {
            opacity: 0;
            transform: scale(0) rotate(-90deg);
        }

        .food-switch-wrapper .switch-input:checked ~ .switch-track .fries-container {
            opacity: 1;
            transform: scale(1);
        }

        .food-switch-wrapper .switch-input:checked ~ .switch-track .fry-box {
            animation: spinFries 3s infinite linear;
        }

        .food-switch-wrapper .switch-input:checked ~ .switch-track {
            background-color: var(--bg-fries);
        }

        @keyframes spinFries {
            0% { transform: rotateX(-20deg) rotateY(0deg); }
            100% { transform: rotateX(-20deg) rotateY(360deg); }
        }
      `}} />
    </div>
  );
}

export default FoodSwitch;
