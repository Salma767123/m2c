"use client";

import { useState } from "react";
import { ArrowLeft, Send, Clock, CheckCircle, User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import Dropdown from "../../UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

import supportService, { SupportTicket, TicketMessage } from "@/services/supportService";
import { useEffect } from "react";
import { hasPermission } from "@/lib/auth";
import TicketAttachments from "./TicketAttachments";

export default function TicketDetail({ ticketId }: { ticketId: string }) {
  const canManage = hasPermission("support:edit");
  const [replyMessage, setReplyMessage] = useState("");
  const [ticketStatus, setTicketStatus] = useState("in-progress");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      const res = await supportService.getTicketById(ticketId);
      if (res.success && res.data) {
        setTicket(res.data);
        setMessages(res.data.messages || []);
        setTicketStatus(res.data.status || "open");
      }
    } catch (error) {
      showErrorToast("Error", "Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await supportService.replyToTicket(ticketId, { message: replyMessage });
      if (res.success) {
        showSuccessToast("Reply Sent", "Your response has been sent.");
        setReplyMessage("");
        fetchTicket(); // Refresh to get the new message
      }
    } catch (error: any) {
      showErrorToast("Failed", error.message || "Failed to send reply. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string | string[]) => {
    try {
      const res = await supportService.updateTicketStatus(ticketId, newStatus as string);
      if (res.success) {
        setTicketStatus(newStatus as string);
        showSuccessToast("Status Updated", `Ticket status changed to ${newStatus}`);
        fetchTicket(); // Refresh
      }
    } catch (error: any) {
      showErrorToast("Failed", error.message || "Failed to update status.");
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === "resolved") {
      handleStatusChange("resolved");
    } else if (action === "request_info") {
      setReplyMessage("Could you please provide more information regarding this issue so we can better assist you?");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Loading ticket details...</div>;
  }

  if (!ticket) {
    return <div className="p-6 text-center text-red-500">Ticket not found.</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-50 text-red-700 border border-red-200";
      case "in-progress":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "resolved":
        return "bg-green-50 text-green-700 border border-green-200";
      case "closed":
        return "bg-slate-50 text-slate-700 border border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-50 text-red-700 border border-red-200";
      case "high":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border border-green-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  // The same page serves customer, vendor and admin tickets — label the raiser by
  // whoever actually opened it instead of hardcoding "Vendor".
  const creatorLabel =
    ticket.creatorType === "user" ? "Customer" :
    ticket.creatorType === "vendor" ? "Vendor" :
    ticket.creatorType === "admin" ? "Admin" : "Requester";

  // Support is now split into scoped Vendor/Customer lists. Go back to the list the
  // ticket actually belongs to, not the old combined view — otherwise "back" lands
  // on a page the sidebar no longer links to.
  const listHref = ticket.creatorType === "user"
    ? "/admin/dashboard/support/customer"
    : "/admin/dashboard/support/vendor";

  return (
    <div className="p-6 max-w-420 mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={listHref} className="text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{ticket.subject}</h1>
          <p className="text-slate-600 mt-1">Ticket ID: {ticket.ticketId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Ticket Information</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace("-", " ").toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Priority:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Category:</span>
                  <span className="text-sm font-medium text-slate-900">{ticket.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Created:</span>
                  <span className="text-sm text-slate-900">{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Last Updated:</span>
                  <span className="text-sm text-slate-900">{new Date(ticket.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* The full issue the user typed — the whole point of the ticket, so it
                  must be shown, not just the metadata above it. */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-600">Description:</span>
                <p className="mt-1.5 text-sm text-slate-900 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {ticket.description}
                </p>
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm text-slate-600">Attachments:</span>
                  <TicketAttachments urls={ticket.attachments} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Conversation</h2>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No replies yet. Send a response below to start the conversation.
                  </p>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === "admin" || message.senderType === "super_admin" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${message.senderType === "admin" || message.senderType === "super_admin"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-900"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-semibold">{message.senderName}</span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                      <TicketAttachments urls={message.attachments} dark={message.senderType === "admin" || message.senderType === "super_admin"} />
                      <p
                        className={`text-xs mt-2 ${message.senderType === "admin" || message.senderType === "super_admin" ? "text-blue-100" : "text-slate-500"
                          }`}
                      >
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reply Form */}
          {canManage && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Send Reply</h2>
                <form onSubmit={handleSubmitReply} className="space-y-4">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={`Type your response to the ${creatorLabel.toLowerCase()}...`}
                    rows={5}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || !replyMessage.trim()}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{creatorLabel} Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-600">Name:</span>
                  <p className="font-medium text-slate-900">{ticket.creatorName}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Email:</span>
                  <p className="font-medium text-slate-900">{ticket.creatorEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          {canManage && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Update Status</h2>
                <Dropdown
                  value={ticketStatus}
                  options={[
                    { value: "open", label: "Open" },
                    { value: "in-progress", label: "In Progress" },
                    { value: "resolved", label: "Resolved" },
                    { value: "closed", label: "Closed" },
                  ]}
                  onChange={handleStatusChange}
                  placeholder="Select status"
                />
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {canManage && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => handleQuickAction("resolved")}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                  <button
                    onClick={() => handleQuickAction("request_info")}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Request More Info
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
