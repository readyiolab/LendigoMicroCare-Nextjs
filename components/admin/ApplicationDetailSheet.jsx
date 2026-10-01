import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ApplicationProvider } from '@/components/admin/application-details/context/ApplicationContext';
import ApplicationDetailContent from './application-details/ApplicationDetailContent';

const ApplicationDetailSheet = ({ applicationId, isOpen, onClose, onUpdate, defaultTab, targetEmiId, isRepaymentReview = false }) => {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[95%] sm:max-w-4xl overflow-y-auto p-0 gap-0 border-l border-gray-200 shadow-2xl transition-all duration-300">
                <ApplicationProvider 
                    applicationId={applicationId}
                    isOpen={isOpen}
                    onClose={onClose}
                    onUpdate={onUpdate}
                    defaultTab={defaultTab}
                    targetEmiId={targetEmiId}
                    isRepaymentReview={isRepaymentReview}
                >
                    <ApplicationDetailContent />
                </ApplicationProvider>
            </SheetContent>
        </Sheet>
    );
};

export default ApplicationDetailSheet;
