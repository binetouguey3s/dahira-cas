import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Accueil from "@/pages/Accueil";
import Biographie from "@/pages/Biographie";
import Connexion from "@/pages/Connexion";
import Cotisations from "@/pages/Cotisations";
import EvenementDetail from "@/pages/EvenementDetail";
import Evenements from "@/pages/Evenements";
import Inscription from "@/pages/Inscription";
import MediaDetail from "@/pages/MediaDetail";
import Mediatheque from "@/pages/Mediatheque";
import Profil from "@/pages/Profil";
import QuestionsReponses from "@/pages/QuestionsReponses";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import EvenementAdmin from "@/pages/admin/EvenementAdmin";
import Finance from "@/pages/admin/Finance";
import AdminOustaz from "@/pages/admin/AdminOustaz";

const ROLES_ADMIN = ["responsable_finance", "oustaz", "admin_contenus", "admin_general"];

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/connexion" element={<Connexion />} />

            <Route path="/" element={<Accueil />} />
            <Route path="/biographie" element={<Biographie />} />
            <Route path="/mediatheque" element={<Mediatheque />} />
            <Route path="/mediatheque/:id" element={<MediaDetail />} />
            <Route path="/evenements" element={<Evenements />} />
            <Route path="/evenements/:id" element={<EvenementDetail />} />

            <Route
              path="/profil"
              element={
                <ProtectedRoute>
                  <Profil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cotisations"
              element={
                <ProtectedRoute>
                  <Cotisations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/questions-reponses"
              element={
                <ProtectedRoute>
                  <QuestionsReponses />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute rolesAutorises={ROLES_ADMIN}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance"
              element={
                <ProtectedRoute rolesAutorises={["responsable_finance", "admin_general"]}>
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/evenements"
              element={
                <ProtectedRoute rolesAutorises={["admin_contenus", "admin_general"]}>
                  <EvenementAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/oustaz"
              element={
                <ProtectedRoute rolesAutorises={["oustaz", "admin_general"]}>
                  <AdminOustaz />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
