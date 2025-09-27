import { BrowserRouter, Routes, Route } from "react-router-dom";
import Editor from "src/pages/Editor";
import Login from "src/pages/Login";
import Signup from "src/pages/Signup";
import Dashboard from "src/pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}
