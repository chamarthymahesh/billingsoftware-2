import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0F172A' }}>
      <Sidebar />
      <div className="main-content" style={{ 
        flex: 1, 
        marginLeft: '260px', 
        padding: '2rem', 
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
