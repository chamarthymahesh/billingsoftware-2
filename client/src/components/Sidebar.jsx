import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  TrendingUp,
  Package,
  LineChart,
  Settings,
  Receipt,
  Layers,
  Scale,
  FileText,
  Crown,
  LogOut
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo')) || { name: 'User', role: 'Staff' };
  
  // Get initials for avatar
  const initials = userInfo.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Companies', path: '/companies', icon: Building2 },
    { name: 'Purchases', path: '/purchases', icon: ShoppingCart },
    { name: 'Sales', path: '/sales', icon: TrendingUp },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Reports', path: '/reports', icon: LineChart },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'All Invoices', path: '/invoices', icon: Receipt },
    { name: 'Global Stock', path: '/global-stock', icon: Layers },
    { name: 'Stock Adjustment', path: '/stock-adjustment', icon: Scale },
    { name: 'GSTR-1 Report', path: '/gstr1', icon: FileText },
  ];

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const isAdmin = userInfo.role === 'Super Admin' || userInfo.role === 'Company Admin';
  const hasAccess = (path) => {
    if (isAdmin) return true;
    return userInfo.permissions?.includes(path);
  };

  return (
    <aside className="sidebar">
      <div className="user-profile">
        <div className="avatar">
          {initials}
        </div>
        <div className="user-info">
          <h3>{userInfo.name}</h3>
          <div className="role-badge">
            {userInfo.role === 'Super Admin' && <Crown size={14} className="crown-icon" />}
            <span>{userInfo.role}</span>
          </div>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.filter(item => hasAccess(item.path)).map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <item.icon className="nav-icon" size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
        {/* Admin only items */}
        {isAdmin && (
          <NavLink
            to="/user-roles"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <Crown className="nav-icon" size={20} />
            <span>User Roles</span>
          </NavLink>
        )}
      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
