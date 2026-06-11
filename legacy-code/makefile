ifneq (,$(wildcard .env))
    include .env
    export
endif

.PHONY: db

db:
	@psql "$(SUPABASE_DB_URL_CLI_CONNECT)"