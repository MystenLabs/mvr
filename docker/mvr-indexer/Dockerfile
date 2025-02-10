FROM rust:1.81.0 AS builder

ARG PROFILE=release

WORKDIR work

COPY indexer/ ./
COPY docker/mvr-indexer/entry.sh ./
RUN apt-get update && apt-get install -y build-essential libssl-dev pkg-config curl cmake clang ca-certificates
ENV PATH="/root/.cargo/bin:${PATH}"

RUN cargo build --profile $PROFILE --bin mvr-indexer --config net.git-fetch-with-cli=true

FROM debian:bookworm-slim AS runtime

RUN apt-get update
RUN apt-get -y --no-install-recommends install wget \
        iputils-ping procps bind9-host bind9-dnsutils curl iproute2 git ca-certificates libpq-dev

COPY --from=builder /work/target/release/mvr-indexer /opt/mysten/bin/
COPY --from=builder /work/entry.sh .
RUN ["chmod", "+x", "/opt/mysten/bin/mvr-indexer"]
RUN ["chmod", "+x", "entry.sh"]

CMD ["./entry.sh"]