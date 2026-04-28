import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PrivateRoute, PublicRoute } from '../routes/PrivateRoute';

import Landing from '../pages/Landing';
import Start from '../pages/Start';
import Login from '../pages/Login';
import Home from '../pages/Home';

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Start />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/home" element={ <PrivateRoute><Home /></PrivateRoute>} />
      </Routes>
    </AnimatePresence>
  );
}
