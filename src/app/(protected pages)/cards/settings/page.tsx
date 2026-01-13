import CardSettingsClient from "./client";

type Props = {
  searchParams?: { card?: string };
};

export default function CardSettingsPage({ searchParams }: Props) {
  const cardId = searchParams?.card ?? "";
  return <CardSettingsClient cardId={cardId} />;
}

