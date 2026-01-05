import DepositModal from "../Transaction Modal/DepositModal";

type CardDepositModalProps = {
  open: boolean;
  cardLabel: string;
  onClose: () => void;
};

export default function CardDepositModal({
  open,
  cardLabel,
  onClose,
}: CardDepositModalProps) {
  if (!open) {
    return null;
  }

  return <DepositModal open={open} walletName={cardLabel} onClose={onClose} />;
}
