-- Enable loan liquidation permission by default for admin-like roles
UPDATE users
SET can_liquidate_loans = TRUE
WHERE role IN ('admin', 'super_admin', 'treasurer', 'chairman')
  AND can_liquidate_loans IS DISTINCT FROM TRUE;
