import { MotionConfig } from "motion/react";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { EcranChargement, ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { ParametresProvider } from "@/context/ParametresContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { TraductionProvider } from "@/context/TraductionContext";
import { ROLES_ADMIN } from "@/lib/navigation";

import Accueil from "@/pages/Accueil";
import Connexion from "@/pages/Connexion";
import Inscription from "@/pages/Inscription";

// Les autres pages sont chargées à la demande : le site s'ouvre plus vite.
const Biographie = lazy(() => import("@/pages/Biographie"));
const Mediatheque = lazy(() => import("@/pages/Mediatheque"));
const MediaDetail = lazy(() => import("@/pages/MediaDetail"));
const Evenements = lazy(() => import("@/pages/Evenements"));
const EvenementDetail = lazy(() => import("@/pages/EvenementDetail"));
const QuestionsReponses = lazy(() => import("@/pages/QuestionsReponses"));
const Cotisations = lazy(() => import("@/pages/Cotisations"));
const Profil = lazy(() => import("@/pages/Profil"));
const Carte = lazy(() => import("@/pages/Carte"));
const VerifierCarte = lazy(() => import("@/pages/VerifierCarte"));
const Introuvable = lazy(() => import("@/pages/Introuvable"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminMembres = lazy(() => import("@/pages/admin/AdminMembres"));
const AdminFinance = lazy(() => import("@/pages/admin/AdminFinance"));
const AdminMediatheque = lazy(() => import("@/pages/admin/AdminMediatheque"));
const AdminEvenements = lazy(() => import("@/pages/admin/AdminEvenements"));
const AdminOustaz = lazy(() => import("@/pages/admin/AdminOustaz"));
const AdminSite = lazy(() => import("@/pages/admin/AdminSite"));

function RemonterEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0 }), [pathname]);
  return null;
}

function Routage() {
  const location = useLocation();
  return (
    <Suspense fallback={<EcranChargement />}>
      <Routes location={location}>
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/verifier/:numero" element={<VerifierCarte />} />

        <Route path="/" element={<Accueil />} />
        <Route path="/biographie" element={<Biographie />} />
        <Route path="/mediatheque" element={<Mediatheque />} />
        <Route path="/mediatheque/:id" element={<MediaDetail />} />
        <Route path="/evenements" element={<Evenements />} />
        <Route path="/evenements/:id" element={<EvenementDetail />} />

        <Route path="/questions-reponses" element={<ProtectedRoute><QuestionsReponses /></ProtectedRoute>} />
        <Route path="/cotisations" element={<ProtectedRoute><Cotisations /></ProtectedRoute>} />
        <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
        <Route path="/carte" element={<ProtectedRoute><Carte /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute roles={ROLES_ADMIN}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/membres" element={<ProtectedRoute roles={["admin_general"]}><AdminMembres /></ProtectedRoute>} />
        <Route path="/admin/finance" element={<ProtectedRoute roles={["responsable_finance"]}><AdminFinance /></ProtectedRoute>} />
        <Route path="/admin/mediatheque" element={<ProtectedRoute roles={["oustaz", "admin_contenus"]}><AdminMediatheque /></ProtectedRoute>} />
        <Route path="/admin/evenements" element={<ProtectedRoute roles={["admin_contenus"]}><AdminEvenements /></ProtectedRoute>} />
        <Route path="/admin/oustaz" element={<ProtectedRoute roles={["oustaz"]}><AdminOustaz /></ProtectedRoute>} />
        <Route path="/admin/site" element={<ProtectedRoute roles={["oustaz", "admin_contenus"]}><AdminSite /></ProtectedRoute>} />

        <Route path="*" element={<Introuvable />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ParametresProvider>
          <TraductionProvider>
            <ToastProvider>
              <AuthProvider>
                <BrowserRouter>
                  <RemonterEnHaut />
                  <Routage />
                </BrowserRouter>
              </AuthProvider>
            </ToastProvider>
          </TraductionProvider>
        </ParametresProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
