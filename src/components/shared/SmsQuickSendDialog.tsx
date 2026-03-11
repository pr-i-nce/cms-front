import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { sendSms } from "@/api/sms";
import { useConfirm } from "@/components/shared/ConfirmProvider";

type SmsQuickSendDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientType: "individual" | "selected" | "department" | "committee" | "all" | "category";
  recipientId?: string;
  recipientIds?: string[];
  recipientLabel?: string;
};

const SmsQuickSendDialog = ({
  open,
  onOpenChange,
  recipientType,
  recipientId,
  recipientIds,
  recipientLabel,
}: SmsQuickSendDialogProps) => {
  const confirm = useConfirm();
  const [message, setMessage] = useState("");
  const [personalize, setPersonalize] = useState(true);
  const [sendMode, setSendMode] = useState("auto");
  const [scheduledAt, setScheduledAt] = useState("");

  const normalizedRecipientIds = useMemo(() => {
    const ids = recipientIds ?? [];
    return Array.from(new Set(ids));
  }, [recipientIds]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (recipientType === "selected" && normalizedRecipientIds.length === 0) {
      toast.error("No recipients selected");
      return;
    }
    if (sendMode === "scheduled" && !scheduledAt) {
      toast.error("Please select a schedule time");
      return;
    }
    const ok = await confirm({
      title: "Send SMS",
      description: "Send this message now?",
      confirmText: "Send",
    });
    if (!ok) return;
    await sendSms({
      recipientType,
      recipientId: recipientType === "individual" || recipientType === "department" || recipientType === "committee" ? recipientId : undefined,
      recipientIds: recipientType === "selected" ? normalizedRecipientIds : undefined,
      message,
      personalize,
      sendMode,
      timeToSend: sendMode === "scheduled" ? scheduledAt.replace("T", " ") : undefined,
    });
    toast.success("SMS sent successfully!");
    setMessage("");
    setScheduledAt("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send message</DialogTitle>
          <DialogDescription>{recipientLabel || "Compose a message for the selected recipient(s)."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Send Mode</Label>
            <Select value={sendMode} onValueChange={setSendMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="bulk">Bulk</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sendMode === "scheduled" && (
            <div className="space-y-2">
              <Label>Schedule Time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              rows={4}
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <div>
              <p className="font-medium">Personalize with name</p>
              <p className="text-xs text-muted-foreground">Use {`{name}`} or auto greeting.</p>
            </div>
            <Switch checked={personalize} onCheckedChange={setPersonalize} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SmsQuickSendDialog;
