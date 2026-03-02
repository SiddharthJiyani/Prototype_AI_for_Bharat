import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  BookOpen,
  Scale,
  Mic,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  FolderOpen,
  ClipboardEdit,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DailyLegalDose from "@/components/DailyLegalDose";
import { apiClient } from '@/lib/axios';
import { getUserId } from "@/utils/userId";
import { useLanguage } from "@/context/LanguageContext";

const SERVICE_KEYS = [
  {
    icon: MessageSquare,
    titleKey: "legal_chat",
    descKey: "legal_chat_desc",
    href: "/nyaymitra/chat",
    badge: "AI + Voice",
    primary: true,
  },
  {
    icon: FileText,
    titleKey: "file_complaint",
    descKey: "file_complaint_desc",
    href: "/nyaymitra/file",
    badge: "Voice",
  },
  {
    icon: FolderOpen,
    titleKey: "legal_desk",
    descKey: "legal_desk_desc",
    href: "/nyaymitra/desk",
    // badge: "New",
  },
  {
    icon: ClipboardEdit,
    titleKey: "form_auto_fill",
    descKey: "form_auto_fill_desc",
    href: "/nyaymitra/forms",
    // badge: "New",
  },
  {
    icon: Scale,
    titleKey: "my_cases",
    descKey: "my_cases_desc",
    href: "/nyaymitra/cases",
    badge: null,
  },
  {
    icon: Search,
    titleKey: "scheme_eligibility",
    descKey: "scheme_eligibility_desc",
    href: "/panchayat/schemes",
    badge: 'Voice',
  },
];

const statusVariant = (s) => {
  if (s === "Filed") return "secondary";
  if (s === "In Progress") return "warning";
  if (s === "Resolved") return "success";
  return "muted";
};

export default function NyayDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [recentCases, setRecentCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();
    apiClient
      .get(`/api/cases/${userId}?userId=${userId}`)
      .then((res) => {
        const sorted = (res.data.cases || [])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);
        setRecentCases(sorted);
      })
      .catch(() => setRecentCases([]))
      .finally(() => setCasesLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('nyaymitra')}
        </p>
        <h1 className="text-2xl font-semibold">{t('citizen_services')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('how_can_we_help')}
        </p>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SERVICE_KEYS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.titleKey}
              onClick={() => navigate(s.href)}
              className={`flex flex-col items-start gap-2.5 rounded-lg border p-4 text-left transition-colors group ${"border-border bg-card hover:bg-secondary/50"}`}>
              <div className="flex w-full items-center justify-between">
                <Icon
                  size={18}
                  className={`${s.primary ? "text-primary" : "text-muted-foreground"} group-hover:text-foreground transition-colors`}
                />
                {s.badge && (
                  <Badge
                    variant={s.badge === "New" ? "success" : "secondary"}
                    className="text-[10px]">
                    {s.badge}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm font-medium leading-snug">{t(s.titleKey)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {t(s.descKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Voice CTA */}
      <div className="flex flex-col items-center gap-3 py-4">
        <button
          onClick={() => navigate("/nyaymitra/chat")}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm active:scale-95">
          <Mic size={22} />
        </button>
        <p className="text-xs text-muted-foreground">
          {t('tap_voice_ask')}
        </p>
      </div>

      {/* Daily Legal Dose */}
      <DailyLegalDose language={language} />

      {/* Recent Cases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('recent_cases')}</h2>
          <button
            onClick={() => navigate("/nyaymitra/cases")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('view_all')} <ChevronRight size={12} />
          </button>
        </div>
        {casesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : recentCases.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground mb-3">
              {t('no_cases_yet')}
            </p>
            <Button size="sm" onClick={() => navigate("/nyaymitra/file")}>
              {t('file_first_case')}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {recentCases.map((c) => (
              <button
                key={c.caseId}
                onClick={() =>
                  navigate(`/nyaymitra/cases/${encodeURIComponent(c.caseId)}`)
                }
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {c.type || t('legal_case')}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />{" "}
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {c.caseId}
                  </p>
                </div>
                <Badge variant={statusVariant(c.status)}>
                  {c.status || "Filed"}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
