import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Components
import WorkStation from './components/WorkStation';
import { Home } from './components/Home';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFound } from './components/NotFound'; // Import your new theme page

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* --- Public Routes --- */}
                <Route path='/' element={<Home />} />
                <Route path='/login' element={<Login />} />
                <Route path='/signup' element={<Register />} />

                {/* --- Protected Routes --- */}
                <Route element={<ProtectedRoute />}>
                    <Route path='/dashboard' element={<Dashboard />} />
                    
                    {/* IMPORTANT: This parameter name ':projectId' must match 
                        what you use in useParams() inside WorkStation.tsx */}
                    <Route path='/workstation/:projectId' element={<WorkStation />} />
                </Route>

                {/* --- Catch-all / 404 --- */}
                {/* This handles completely unknown URLs (e.g. /garbage-url) */}
                <Route path='*' element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}