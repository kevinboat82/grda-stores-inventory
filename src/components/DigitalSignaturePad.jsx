import React, { useRef, useEffect, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

const DigitalSignaturePad = ({ value, onChange, label = 'Digital signature' }) => {
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const [hasStroke, setHasStroke] = useState(!!value);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#1a4d2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        if (value) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setHasStroke(true);
            };
            img.src = value;
        }
    }, [value]);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: ((clientX - rect.left) / rect.width) * canvas.width,
            y: ((clientY - rect.top) / rect.height) * canvas.height,
        };
    };

    const start = (e) => {
        e.preventDefault();
        drawing.current = true;
        const ctx = canvasRef.current.getContext('2d');
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const move = (e) => {
        if (!drawing.current) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasStroke(true);
    };

    const end = () => {
        if (!drawing.current) return;
        drawing.current = false;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onChange?.(dataUrl);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasStroke(false);
        onChange?.('');
    };

    return (
        <div className="signature-pad-wrap">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <PenLine size={15} /> {label}
            </label>
            <canvas
                ref={canvasRef}
                width={480}
                height={140}
                className="signature-canvas"
                onMouseDown={start}
                onMouseMove={move}
                onMouseUp={end}
                onMouseLeave={end}
                onTouchStart={start}
                onTouchMove={move}
                onTouchEnd={end}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={clear}>
                    <Eraser size={14} /> Clear
                </button>
                {!hasStroke && <span className="text-sm text-muted">Sign above with mouse or finger</span>}
            </div>
        </div>
    );
};

export default DigitalSignaturePad;
