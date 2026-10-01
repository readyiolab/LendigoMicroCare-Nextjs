import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SanctionLetter from "@/components/loans/SanctionLetter";

export default function SanctionLetterDialog({ open, onOpenChange, application, userProfile }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loan Sanction Letter</DialogTitle>
        </DialogHeader>
        <SanctionLetter application={application} userProfile={userProfile} />
      </DialogContent>
    </Dialog>
  );
}
