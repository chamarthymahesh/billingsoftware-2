import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit, Trash2, X, Shield } from "lucide-react";
import "./UserRoles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const UserRoles = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "",
    permissions: [],
  });

  // Available permissions (matching sidebar paths)
  const availablePermissions = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Companies", path: "/companies" },
    { label: "Purchases", path: "/purchases" },
    { label: "Sales", path: "/sales" },
    { label: "Products", path: "/products" },
    { label: "Reports", path: "/reports" },
    { label: "Settings", path: "/settings" },
    // { label: 'All Invoices', path: '/invoices' },
    { label: "Global Stock", path: "/global-stock" },
    { label: "Stock Adjustment", path: "/stock-adjustment" },
    { label: "GSTR-1 Report", path: "/gstr1" },
  ];

  const fetchUsers = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      const { data } = await axios.get(`${API}/api/users/sub-users`, config);
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setFormData({
        id: user._id,
        name: user.name,
        email: user.email,
        password: "", // Blank for editing unless changing
        role: user.role,
        permissions: user.permissions || [],
      });
    } else {
      setFormData({ id: null, name: "", email: "", password: "", role: "", permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCheckboxChange = (path) => {
    setFormData((prev) => {
      const newPerms = prev.permissions.includes(path)
        ? prev.permissions.filter((p) => p !== path)
        : [...prev.permissions, path];
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

      if (formData.id) {
        // Update
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // Don't send empty password
        await axios.put(`${API}/api/users/sub-users/${formData.id}`, payload, config);
      } else {
        // Create
        await axios.post(`${API}/api/users/sub-users`, formData, config);
      }

      fetchUsers();
      handleCloseModal();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving user");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user account?")) {
      try {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
        await axios.delete(`${API}/api/users/sub-users/${id}`, config);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || "Error deleting user");
      }
    }
  };

  // Helper to map paths to nice labels
  const getLabelForPath = (path) => {
    const found = availablePermissions.find((p) => p.path === path);
    return found ? found.label : path;
  };

  return (
    <div className="users-page sl-page animate-fade-in">
      <div className="users-header">
        <div>
          <h1 className="users-title">User Roles & Access</h1>
          <p className="users-subtitle">Manage staff accounts and their menu permissions</p>
        </div>
        <button className="add-user-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Create Sub-User
        </button>
      </div>

      {loading ? (
        <div className="loader sl-center">Loading users...</div>
      ) : error ? (
        <div className="error-msg sl-center" style={{ color: "#ef4444" }}>
          {error}
        </div>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / UserID</th>
                <th>Role</th>
                <th>Menu Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="sl-center" style={{ padding: "40px 0" }}>
                    <Shield size={48} style={{ color: "#334155", marginBottom: "16px" }} />
                    <p style={{ color: "#94a3b8" }}>No sub-users created yet.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td style={{ fontWeight: 600 }}>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-tag">{user.role || "Staff"}</span>
                    </td>
                    <td>
                      <div className="perms-list">
                        {user.permissions && user.permissions.length > 0 ? (
                          user.permissions.map((p) => (
                            <span key={p} className="perm-tag">
                              {getLabelForPath(p)}
                            </span>
                          ))
                        ) : (
                          <span className="perm-tag" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                            No Access
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <button
                          onClick={() => handleOpenModal(user)}
                          style={{ background: "transparent", border: "none", color: "#f59e0b", cursor: "pointer" }}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <div className="modal-header">
              <h2>{formData.id ? "Edit User Role" : "Create New User"}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email (Used for Login)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g., manager@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>
                  Password{" "}
                  {formData.id && (
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>(Leave blank to keep current)</span>
                  )}
                </label>
                <input
                  type="password"
                  required={!formData.id}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Role Name (e.g., Manager, Sales)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Manager"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginTop: "24px" }}>
                <label>Menu Access Permissions</label>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "12px" }}>
                  Select which menus this user can access in their sidebar:
                </p>
                <div className="permissions-grid">
                  {availablePermissions.map((perm) => (
                    <label key={perm.path} className="perm-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.path)}
                        onChange={() => handleCheckboxChange(perm.path)}
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {formData.id ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoles;
