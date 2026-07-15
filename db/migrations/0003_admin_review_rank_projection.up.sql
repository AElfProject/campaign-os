CREATE INDEX campaign_os_campaign_participants_dynamic_rank_idx
  ON campaign_os.campaign_participants (
    campaign_id,
    total_points DESC,
    created_at ASC,
    id COLLATE "C" ASC,
    wallet_address COLLATE "C" ASC
  );
