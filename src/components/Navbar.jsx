import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav className="bg-blue-900 text-white p-4 flex justify-between">
      <div className="flex gap-4">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/logs">Logs</Link>
        <Link to="/vulnerabilities">Vulnerabilities</Link>
      </div>
      <button onClick={logout} className="bg-red-500 px-3 py-1 rounded">
        Logout
      </button>
    </nav>
  );
}
