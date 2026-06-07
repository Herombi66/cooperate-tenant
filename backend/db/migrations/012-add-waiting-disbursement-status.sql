-- Add waiting_disbursement status to loans table
ALTER TYPE "enum_loans_status" ADD VALUE 'waiting_disbursement';
