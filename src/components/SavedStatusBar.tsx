import { useDBStore } from '../store/dbStore';
import { Loader2, CheckCircle2, CircleDot, AlertCircle } from 'lucide-react';

export const SaveStatus = () => {
  const status = useDBStore((state) => state.saveStatus);

  // 1. Saving State
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  // 2. Unsaved Changes (Wait for Ctrl+S)
  if (status === 'unsaved') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
        <CircleDot className="w-4 h-4 fill-amber-600" />
        <span>Unsaved Changes</span>
        <span className="text-xs text-amber-500/80 hidden sm:inline">(Ctrl + S)</span>
      </div>
    );
  }

  // 3. Saved State
  if (status === 'saved') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="w-4 h-4" />
        <span>Saved</span>
      </div>
    );
  }

  // 4. Error State
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="w-4 h-4" />
        <span>Save Failed</span>
      </div>
    );
  }

  return null;
};