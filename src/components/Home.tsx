import Spline from '@splinetool/react-spline';
import './css/home.css';
import { useRef } from 'react';
import GlassButton from './GlassButton'; // Ensure path is correct
import { Link } from 'react-router-dom';

export function Home() {
    const splineRef = useRef<any>(null);

    function onLoad(spline: any) {
        splineRef.current = spline;
        // Optional: Adjust zoom based on screen width if needed
        spline.setZoom(0.6); 
    }

    return (
        <div className="page-wrapper">
            {/* LAYER 1: The Content (Text + Button) */}
            <div className="content-layer">
                <div className="hero-text-container">
                    <h1 className="hero-title">DB-builder</h1>
                    <p className="hero-subtitle">Build databases faster.</p>
                    
                    <div className="button-wrapper">
                        <Link to='/login'>
                        <GlassButton>Start now!</GlassButton>
                        </Link>
                    </div>
                </div>
            </div>

            {/* LAYER 2: The 3D Scene (Background) */}
            <div className="spline-layer">
                <Spline 
                    onLoad={onLoad} 
                    scene="https://prod.spline.design/uC4DlhEGergzUXq4/scene.splinecode"
                />
            </div>
        </div>
    );
}