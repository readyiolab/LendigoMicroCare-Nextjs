import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams } from '@/lib/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { dsaPartnerHomePath, isDsaPartnerRole } from '@/components/admin/DsaPartnerRouteGuard';
import { ApplicationProvider } from '@/components/admin/application-details/context/ApplicationContext';
import ApplicationDetailContent from '@/components/admin/application-details/ApplicationDetailContent';
import { SECTION_META, normalizeSectionId } from '@/components/admin/application-details/shell/sectionConfig';

export default function ApplicationDetailsPage() {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { admin } = useAdminAuth();
    const { onApplicationUpdated } = useOutletContext() || {};

    const defaultTab = useMemo(() => {
        const raw = normalizeSectionId(searchParams.get('tab') || '');
        return raw && SECTION_META[raw] ? raw : 'overview';
    }, [searchParams]);

    useEffect(() => {
        if (isDsaPartnerRole(admin)) {
            navigate(dsaPartnerHomePath(), { replace: true });
        }
    }, [admin, navigate]);

    const handleClose = () => {
        // Unlock is handled once in ApplicationContext on unmount
        navigate(isDsaPartnerRole(admin) ? dsaPartnerHomePath() : '/admin/applications');
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <ApplicationProvider 
                key={applicationId}
                applicationId={applicationId}
                isOpen={true}
                onClose={handleClose}
                onUpdate={(appId, newStatus) => onApplicationUpdated?.(appId, newStatus)}
                defaultTab={defaultTab}
                persistTabInUrl
            >
                <ApplicationDetailContent />
            </ApplicationProvider>
        </div>
    );
}
