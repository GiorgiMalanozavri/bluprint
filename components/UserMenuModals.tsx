"use client";

import { useState, useEffect, useTransition } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { updateUserProfile, updatePassword, deleteAccount } from "@/actions/settings";
import { COUNTRIES } from "@/lib/countries";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="bg-[var(--surface)] rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-hidden border border-[var(--border)]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                                <h2 className="text-xl font-semibold">{title}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-[var(--surface-secondary)] rounded-lg transition-colors text-[var(--muted)]"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [user, setUser] = useState<any>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [country, setCountry] = useState("");
    const [password, setPassword] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen) {
            const supabase = createClient();
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    setUser(user);
                    setEmail(user.email || "");
                    setName(user.user_metadata?.name || "");
                    setCountry(user.user_metadata?.country || "");
                }
            });
        }
    }, [isOpen]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('country', country);
        startTransition(async () => {
            const result = await updateUserProfile(formData);
            if (result?.error) setError(result.error);
            else setSuccess("Profile updated successfully!");
        });
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const formData = new FormData();
        formData.append('password', password);
        startTransition(async () => {
            const result = await updatePassword(formData);
            if (result?.error) setError(result.error);
            else { setSuccess("Password updated successfully!"); setPassword(""); }
        });
    };

    const handleDeleteAccount = async () => {
        setError("");
        setSuccess("");
        startTransition(async () => {
            const result = await deleteAccount(deleteConfirmation);
            if (result?.error) setError(result.error);
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings">
            <div className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm font-medium">
                        {success}
                    </div>
                )}

                <form onSubmit={handleUpdateProfile}>
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3">Profile Information</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-1.5">Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all" placeholder="Your name" />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-1.5">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all" placeholder="your@email.com" />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-1.5">Country (for visa guidance)</label>
                            <select value={country} onChange={(e) => setCountry(e.target.value)}
                                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all">
                                <option value="">Select your country</option>
                                {COUNTRIES.map((c) => (
                                    <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={isPending}
                        className="w-full mt-4 btn-accent h-10 disabled:opacity-50">
                        {isPending ? "Updating..." : "Update Profile"}
                    </button>
                </form>

                <form onSubmit={handleUpdatePassword} className="pt-5 border-t border-[var(--border)]">
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3">Change Password</h3>
                    <div>
                        <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-1.5">New Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                            className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all" placeholder="Min 6 characters" />
                    </div>
                    <button type="submit" disabled={isPending || !password}
                        className="w-full mt-4 btn-accent h-10 disabled:opacity-50">
                        {isPending ? "Updating..." : "Update Password"}
                    </button>
                </form>

                <div className="pt-5 border-t border-[var(--border)]">
                    <h3 className="text-sm font-semibold text-red-700 mb-3">Danger Zone</h3>
                    <p className="text-sm text-[var(--muted)] mb-3">
                        Type <span className="font-mono font-semibold">DELETE</span> to permanently delete your account
                    </p>
                    <input type="text" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="w-full px-4 py-2.5 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500/15 focus:border-red-400 outline-none transition-all mb-3" placeholder="Type DELETE" />
                    <button type="button" onClick={handleDeleteAccount} disabled={isPending || deleteConfirmation !== 'DELETE'}
                        className="w-full py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all disabled:opacity-50">
                        {isPending ? "Deleting..." : "Delete Account"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function ReportBugModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Report a Bug">
            <div className="space-y-4">
                <div>
                    <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-2">What went wrong?</label>
                    <input type="text" className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all" placeholder="Brief description" />
                </div>
                <div>
                    <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-2">Details</label>
                    <textarea rows={5} className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all resize-none" placeholder="Please describe the bug in detail..." />
                </div>
                <div>
                    <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-2">Priority</label>
                    <select className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all">
                        <option>Low - Minor issue</option>
                        <option>Medium - Affects functionality</option>
                        <option>High - Blocks important features</option>
                        <option>Critical - App is unusable</option>
                    </select>
                </div>
                <button className="w-full btn-accent h-10">Submit Bug Report</button>
            </div>
        </Modal>
    );
}

export function RequestFeatureModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Request a Feature">
            <div className="space-y-4">
                <div>
                    <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-2">Feature Title</label>
                    <input type="text" className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all" placeholder="What feature would you like?" />
                </div>
                <div>
                    <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-2">Description</label>
                    <textarea rows={5} className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all resize-none" placeholder="Describe the feature and how it would help you..." />
                </div>
                <div>
                    <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-2">Category</label>
                    <select className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] outline-none transition-all">
                        <option>Resume Builder</option>
                        <option>Job Search</option>
                        <option>Company Database</option>
                        <option>Events</option>
                        <option>Other</option>
                    </select>
                </div>
                <button className="w-full btn-accent h-10">Submit Feature Request</button>
            </div>
        </Modal>
    );
}

export function ChangeAvatarModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const avatarColors = [
        { from: "from-blue-500", to: "to-cyan-500", name: "Ocean" },
        { from: "from-purple-500", to: "to-pink-500", name: "Sunset" },
        { from: "from-green-500", to: "to-emerald-500", name: "Forest" },
        { from: "from-sky-500", to: "to-red-500", name: "Fire" },
        { from: "from-indigo-500", to: "to-purple-500", name: "Galaxy" },
        { from: "from-yellow-500", to: "to-sky-500", name: "Sunshine" },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Change Avatar">
            <div className="space-y-4">
                <p className="text-sm text-[var(--muted)]">Choose a color scheme for your avatar</p>
                <div className="grid grid-cols-3 gap-4">
                    {avatarColors.map((color, index) => (
                        <button key={index} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--surface-secondary)] transition-colors group">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color.from} ${color.to} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                                <span className="text-lg">U</span>
                            </div>
                            <span className="text-xs text-[var(--muted)]">{color.name}</span>
                        </button>
                    ))}
                </div>
                <div className="pt-4 border-t border-[var(--border)]">
                    <label className="block text-[13px] font-medium text-[var(--muted-foreground)] mb-2">Or upload a custom image</label>
                    <input type="file" accept="image/*" className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm" />
                </div>
                <button className="w-full btn-accent h-10">Save Avatar</button>
            </div>
        </Modal>
    );
}
