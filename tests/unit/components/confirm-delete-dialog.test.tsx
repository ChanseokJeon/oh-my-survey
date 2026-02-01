import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';

describe('ConfirmDeleteDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item?',
    onConfirm: vi.fn(),
  };

  it('renders dialog when open', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDeleteDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when delete button clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('confirm-delete-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange when cancel button clicked', () => {
    const onOpenChange = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading spinner when isDeleting is true', () => {
    render(<ConfirmDeleteDialog {...defaultProps} isDeleting={true} />);
    expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows custom confirm text', () => {
    render(<ConfirmDeleteDialog {...defaultProps} confirmText="Remove" />);
    expect(screen.getByTestId('confirm-delete-button')).toHaveTextContent('Remove');
  });

  it('has destructive styling on confirm button', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);
    const button = screen.getByTestId('confirm-delete-button');
    expect(button.className).toContain('destructive');
  });
});
