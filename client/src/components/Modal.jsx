import React from "react";
import "../assets/index.css"; 

const Modal = ({ open, title, children, onClose, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {title && <h2>{title}</h2>}
        <div>{children}</div>
        {/* Show action bar only if onConfirm is defined */}
        {onConfirm && (
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
