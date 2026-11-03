import { lazy, Suspense } from 'react';
import PageBoundary from '../components/routing/PageBoundary';
import QueryStatus from '../components/shared/QueryStatus';
function page(loader, exportName = 'default') {
    const Loaded = lazy(async () => { const module = await loader(); return { default: module[exportName] }; });
    return function RoutePage(props) { return <PageBoundary><Suspense fallback={<QueryStatus query={{ isPending: true }} />}><Loaded {...props} /></Suspense></PageBoundary>; };
}
const AdminRecordListPage = page(() => import("../pages/admin/AdminRecordPages"), "AdminRecordListPage");
const AdminRecordDetailPage = page(() => import("../pages/admin/AdminRecordPages"), "AdminRecordDetailPage");
const AdminCatalogPage = page(() => import("../pages/admin/AdminResourcePages"), "AdminCatalogPage");
const AdminResourceList = page(() => import("../pages/admin/AdminResourcePages"), "AdminResourceList");
const AdminResourceEditPage = page(() => import("../pages/admin/AdminResourcePages"), "AdminResourceEditPage");
const HomePage = page(() => import("../pages/public/HomePage"));
const MagazinePage = page(() => import("../pages/public/MagazinePage"));
const PublicInfoPage = page(() => import("../pages/public/PublicInfoPage"));
const ComparisonPage = page(() => import("../pages/public/ComparisonPage"));
const ListingsPage = page(() => import("../pages/public/ListingsPage"));
const ListingDetailsPage = page(() => import("../pages/public/ListingDetailsPage"));
const DealersPage = page(() => import("../pages/public/DealersPage"));
const DealerPublicPage = page(() => import("../pages/public/DealerPublicPage"));
const LoginPage = page(() => import("../pages/auth/LoginPage"));
const VerifyOtpPage = page(() => import("../pages/auth/VerifyOtpPage"));
const CompleteProfilePage = page(() => import("../pages/auth/CompleteProfilePage"));
const CreateListingPage = page(() => import("../pages/listing/CreateListingPage"));
const DashboardHomePage = page(() => import("../pages/dashboard/DashboardHomePage"));
const MyListingsPage = page(() => import("../pages/dashboard/MyListingsPage"));
const FavoritesPage = page(() => import("../pages/dashboard/FavoritesPage"));
const ProfilePage = page(() => import("../pages/dashboard/ProfilePage"));
const MyReportsPage = page(() => import("../pages/dashboard/MyReportsPage"));
const SavedSearchesPage = page(() => import("../pages/dashboard/SavedSearchesPage"));
const NotificationsPage = page(() => import("../pages/dashboard/NotificationsPage"));
const ViewHistoryPage = page(() => import("../pages/dashboard/ViewHistoryPage"));
const SessionsPage = page(() => import("../pages/dashboard/SessionsPage"));
const DealerRegistrationPage = page(() => import("../pages/dealer/DealerRegistrationPage"));
const DealerStatusPage = page(() => import("../pages/dealer/DealerStatusPage"));
const DealerDashboardPage = page(() => import("../pages/dealer/DealerDashboardPage"));
const DealerPlansPage = page(() => import("../pages/dealer/DealerPlansPage"));
const DealerCheckoutPage = page(() => import("../pages/dealer/DealerCheckoutPage"));
const DealerListingsPage = page(() => import("../pages/dealer/DealerListingsPage"));
const DealerAnalyticsPage = page(() => import("../pages/dealer/DealerAnalyticsPage"));
const DealerSubscriptionPage = page(() => import("../pages/dealer/DealerSubscriptionPage"));
const DealerProfilePage = page(() => import("../pages/dealer/DealerProfilePage"));
const AdminDashboardPage = page(() => import("../pages/admin/AdminDashboardPage"));
const AdminListingsPage = page(() => import("../pages/admin/AdminListingsPage"));
const AdminDealersPage = page(() => import("../pages/admin/AdminDealersPage"));
const AdminUsersPage = page(() => import("../pages/admin/AdminUsersPage"));
const AdminPlansPage = page(() => import("../pages/admin/AdminPlansPage"));
const AdminSettingsPage = page(() => import("../pages/admin/AdminSettingsPage"));
const NotFoundPage = page(() => import("../pages/errors/NotFoundPage"));

import { Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import DealerLayout from "../layouts/DealerLayout";

import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import ProfileCompletionRoute from "./ProfileCompletionRoute";
import DealerRoute from "./DealerRoute";
































import AdminLayout from "../layouts/AdminLayout";
import AdminRoute from "./AdminRoute";










function AppRouter() {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                {["about", "contact", "terms", "privacy"].map((page) => (
                    <Route
                        key={page}
                        path={`/${page}`}
                        element={<PublicInfoPage key={page} page={page} />}
                    />
                ))}
                <Route
                    path="/rules"
                    element={<Navigate to="/terms" replace />}
                />

                <Route path="/magazine" element={<MagazinePage />} />
                <Route path="/magazine/:articleSlug" element={<MagazinePage />} />
                <Route path="/cars" element={<ListingsPage />} />
                <Route path="/compare" element={<ComparisonPage />} />

                <Route
                    path="/cars/:listingId"
                    element={<ListingDetailsPage />}
                />

                <Route path="/dealers" element={<DealersPage />} />

                <Route
                    path="/dealers/:dealerSlug"
                    element={<DealerPublicPage />}
                />
            </Route>

            <Route path="/auth" element={<AuthLayout />}>
                <Route element={<GuestRoute />}>
                    <Route path="login" element={<LoginPage />} />

                    <Route path="verify-otp" element={<VerifyOtpPage />} />
                </Route>

                <Route element={<ProfileCompletionRoute />}>
                    <Route
                        path="complete-profile"
                        element={<CompleteProfilePage />}
                    />
                </Route>
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<PublicLayout />}>
                    <Route
                        path="/listing/:listingId/edit"
                        element={<CreateListingPage />}
                    />
                    <Route
                        path="/listing/create"
                        element={<CreateListingPage />}
                    />

                    <Route
                        path="/dealer/register"
                        element={<DealerRegistrationPage />}
                    />

                    <Route
                        path="/dealer/status"
                        element={<DealerStatusPage />}
                    />
                </Route>

                <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<DashboardHomePage />} />
                    <Route path="/dashboard/saved-searches" element={<SavedSearchesPage />} />
                    <Route path="/dashboard/reports" element={<MyReportsPage />} />
                    <Route
                        path="/dashboard/sessions"
                        element={<SessionsPage />}
                    />
                    <Route
                        path="/dashboard/notifications"
                        element={<NotificationsPage />}
                    />
                    <Route
                        path="/dashboard/history"
                        element={<ViewHistoryPage />}
                    />

                    <Route
                        path="/dashboard/listings"
                        element={<MyListingsPage />}
                    />

                    <Route
                        path="/dashboard/favorites"
                        element={<FavoritesPage />}
                    />

                    <Route
                        path="/dashboard/profile"
                        element={<ProfilePage />}
                    />
                </Route>

                <Route element={<DealerRoute />}>
                    <Route element={<DealerLayout />}>
                        <Route
                            path="/dealer-dashboard"
                            element={<DealerDashboardPage />}
                        />

                        <Route
                            path="/dealer-dashboard/listings"
                            element={<DealerListingsPage />}
                        />

                        <Route
                            path="/dealer-dashboard/analytics"
                            element={<DealerAnalyticsPage />}
                        />

                        <Route
                            path="/dealer-dashboard/plans"
                            element={<DealerPlansPage />}
                        />

                        <Route
                            path="/dealer-dashboard/subscription"
                            element={<DealerSubscriptionPage />}
                        />

                        <Route
                            path="/dealer-dashboard/profile"
                            element={<DealerProfilePage />}
                        />
                    </Route>

                    <Route element={<PublicLayout />}>
                        <Route
                            path="/dealer/checkout/:planId"
                            element={<DealerCheckoutPage />}
                        />
                    </Route>
                </Route>
            </Route>

            <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />

                    <Route
                        path="/admin/listings"
                        element={<AdminListingsPage />}
                    />

                    <Route
                        path="/admin/dealers"
                        element={<AdminDealersPage />}
                    />

                    <Route path="/admin/users" element={<AdminUsersPage />} />

                    <Route path="/admin/plans" element={<AdminPlansPage />} />

                    {[
                        "users",
                        "dealers",
                        "listings",
                        "reports",
                        "subscriptions",
                        "payments",
                    ].map((resource) => (
                        <Route
                            key={`detail-${resource}`}
                            path={`/admin/${resource}/:recordId`}
                            element={
                                <AdminRecordDetailPage resource={resource} />
                            }
                        />
                    ))}
                    {["reports", "subscriptions", "payments"].map(
                        (resource) => (
                            <Route
                                key={resource}
                                path={`/admin/${resource}`}
                                element={
                                    <AdminRecordListPage resource={resource} />
                                }
                            />
                        ),
                    )}
                    <Route
                        path="/admin/catalog"
                        element={
                            <Navigate to="/admin/catalog/brands" replace />
                        }
                    />
                    <Route
                        path="/admin/catalog/:resource"
                        element={<AdminCatalogPage />}
                    />
                    <Route
                        path="/admin/catalog/:resource/new"
                        element={<AdminResourceEditPage />}
                    />
                    <Route
                        path="/admin/catalog/:resource/:recordId/edit"
                        element={<AdminResourceEditPage />}
                    />
                    <Route
                        path="/admin/plans/new"
                        element={<AdminResourceEditPage resource="plans" />}
                    />
                    <Route
                        path="/admin/plans/:recordId/edit"
                        element={<AdminResourceEditPage resource="plans" />}
                    />
                    <Route
                        path="/admin/banners"
                        element={<AdminResourceList resource="banners" />}
                    />
                    <Route
                        path="/admin/banners/new"
                        element={<AdminResourceEditPage resource="banners" />}
                    />
                    <Route
                        path="/admin/banners/:recordId/edit"
                        element={<AdminResourceEditPage resource="banners" />}
                    />
                    {["articles", "faqs"].map(resource => <Route key={resource}>
                        <Route path={`/admin/${resource}`} element={<AdminResourceList resource={resource} />} />
                        <Route path={`/admin/${resource}/new`} element={<AdminResourceEditPage resource={resource} />} />
                        <Route path={`/admin/${resource}/:recordId/edit`} element={<AdminResourceEditPage resource={resource} />} />
                    </Route>)}
                    <Route
                        path="/admin/settings"
                        element={<AdminSettingsPage />}
                    />
                </Route>
            </Route>

            <Route path="/404" element={<NotFoundPage />} />

            <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
    );
}

export default AppRouter;
