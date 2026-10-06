import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../app/WorkspaceContext';
import { Modal } from './Modal';

interface AddBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBuildModal: React.FC<AddBuildModalProps> = ({ isOpen, onClose }) => {
  const { addBuild } = useWorkspace();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent, andPlan = false) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newBuild = addBuild(title.trim(), description.trim(), category.trim());
    setTitle('');
    setDescription('');
    setCategory('');
    onClose();

    if (andPlan) {
      navigate(`/builds/${newBuild.id}/plan`);
    } else {
      navigate(`/builds/${newBuild.id}/overview`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Capture a Future Build">
      <form onSubmit={e => handleSubmit(e, false)}>
        <p>Give your idea a home. Only a title is required; you can plan the details anytime.</p>

        <div>
          <label htmlFor="build-title-input">Build Title (required)</label>
          <input
            id="build-title-input"
            type="text"
            required
            maxLength={160}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Journal, Recipe Manager, Portfolio..."
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="build-desc-input">One-sentence Purpose (optional)</label>
          <input
            id="build-desc-input"
            type="text"
            maxLength={1000}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does it help you or others do?"
          />
        </div>

        <div>
          <label htmlFor="build-category-input">Category (optional)</label>
          <input
            id="build-category-input"
            type="text"
            maxLength={60}
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g. Personal app, Hardware, Study system..."
          />
        </div>

        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!title.trim()}
            onClick={e => handleSubmit(e, true)}
          >
            Save & Plan
          </button>
          <button type="submit" className="primary" disabled={!title.trim()}>
            Create Build
          </button>
        </div>
      </form>
    </Modal>
  );
};
