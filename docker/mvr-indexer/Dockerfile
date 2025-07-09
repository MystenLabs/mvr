FROM rust:1.87.0 AS builder

ARG PROFILE=release
ARG GIT_REVISION
ENV GIT_REVISION=$GIT_REVISION

WORKDIR work

COPY Cargo.lock Cargo.toml ./
COPY crates/ ./crates/
COPY docker/mvr-indexer/entry.sh ./

RUN apt-get update && apt-get install -y build-essential libssl-dev pkg-config curl cmake clang ca-certificates
ENV PATH="/root/.cargo/bin:${PATH}"
ENV RUSTFLAGS="--cfg tokio_unstable"
ENV TOKIO_CONSOLE=1

RUN cargo build --profile $PROFILE --bin mvr-indexer --config net.git-fetch-with-cli=true

FROM rust:1.87.0 AS runtime

RUN apt-get update
RUN apt-get -y --no-install-recommends install wget \
        iputils-ping procps bind9-host bind9-dnsutils \
        curl iproute2 git ca-certificates libpq-dev \
        postgresql

RUN cargo install tokio-console

COPY --from=builder /work/target/release/mvr-indexer /opt/mysten/bin/
COPY --from=builder /work/entry.sh .
RUN ["chmod", "+x", "/opt/mysten/bin/mvr-indexer"]
RUN ["chmod", "+x", "entry.sh"]

ARG BUILD_DATE
ARG GIT_REVISION
LABEL build-date=$BUILD_DATE
LABEL git-revision=$GIT_REVISION

CMD ["./entry.sh"]
