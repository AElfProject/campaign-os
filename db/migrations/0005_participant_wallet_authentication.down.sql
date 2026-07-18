-- DESTRUCTIVE OPERATOR MAINTENANCE ONLY: ordinary application rollback must never execute this file.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM campaign_os.wallet_sessions LIMIT 1)
    OR EXISTS (SELECT 1 FROM campaign_os.wallet_auth_challenges LIMIT 1)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'PARTICIPANT WALLET AUTHENTICATION DATA EXISTS; migration 0005 down is refused.';
  END IF;
END;
$$;

DROP TABLE campaign_os.wallet_sessions;
DROP TABLE campaign_os.wallet_auth_challenges;
