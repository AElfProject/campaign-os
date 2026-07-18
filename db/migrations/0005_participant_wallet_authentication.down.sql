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

DROP TRIGGER IF EXISTS wallet_session_transition_guard
  ON campaign_os.wallet_sessions;
DROP TRIGGER IF EXISTS wallet_session_challenge_guard
  ON campaign_os.wallet_sessions;
DROP TRIGGER IF EXISTS wallet_auth_challenge_transition_guard
  ON campaign_os.wallet_auth_challenges;
DROP TRIGGER IF EXISTS wallet_auth_challenge_insert_guard
  ON campaign_os.wallet_auth_challenges;

DROP TABLE campaign_os.wallet_sessions;
DROP TABLE campaign_os.wallet_auth_challenges;

DROP FUNCTION IF EXISTS campaign_os.protect_wallet_session_transition();
DROP FUNCTION IF EXISTS campaign_os.validate_wallet_session_challenge();
DROP FUNCTION IF EXISTS campaign_os.protect_wallet_auth_challenge_transition();
DROP FUNCTION IF EXISTS campaign_os.validate_wallet_auth_challenge_insert();
DROP FUNCTION IF EXISTS campaign_os.valid_wallet_auth_id_array(jsonb);
