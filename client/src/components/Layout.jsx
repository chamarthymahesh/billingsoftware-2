import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0F172A' }}>
      <Sidebar />
      <div style={{ 
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
