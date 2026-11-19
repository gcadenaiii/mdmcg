/* Product Build: security and data architecture. SERVER SIDE ONLY (see program.js).
   An Engineering Draft of 2026-11-19. Nothing here is provisioned: no cloud resource has been created for this program.
   The proof of concept is for synthetic, simulated or otherwise non-identifying engineering data only. */

/* Five areas kept apart. `today` is what exists now; `poc` is what the proof of concept would add. */
export const zones = [
  { id: 'Z-1', name: 'Public website', holds: 'Marketing pages. No internal figure.', today: 'Static pages on the company\'s existing server.', poc: 'Unchanged.', data: 'Public' },
  { id: 'Z-2', name: 'Program page', holds: 'This page: schedule, budget, sourcing, risks, gates.', today: 'Built into the site as an encrypted file that opens with an access code. Changes are kept in the reader\'s browser.', poc: 'Unchanged in this program. A shared store with named accounts is the next step if more than a few people edit.', data: 'Internal, confidential' },
  { id: 'Z-3', name: 'Source code and designs', holds: 'Firmware, software, schematics, layouts, models, analysis code.', today: 'Private version-controlled repositories.', poc: 'Unchanged. Branch protection and reviewed changes for releases.', data: 'Internal, confidential' },
  { id: 'Z-4', name: 'Device telemetry and scientific recordings', holds: 'Engineering recordings from the bench and synthetic recordings.', today: 'Local disks.', poc: 'One small cloud instance with an attached encrypted disk and object storage: an ingestion service, a metadata store, raw files kept unchanged.', data: 'Internal. No data that identifies a person.' },
  { id: 'Z-5', name: 'Human-subject or patient data', holds: 'Nothing in this program.', today: 'Does not exist.', poc: 'Not built. Needs the later architecture, the agreements that go with it and written authorisation.', data: 'Not permitted in this program' },
];

/* Flows between the areas (drawn as the diagram on the page). */
export const flows = [
  { from: 'Device', to: 'Recording tool', text: 'Samples with counters and timestamps over a wired or radio link' },
  { from: 'Recording tool', to: 'Ingestion', text: 'File with metadata and a hash, over TLS, signed with the device\'s key' },
  { from: 'Ingestion', to: 'Raw store', text: 'Written once, never changed; hash checked on arrival' },
  { from: 'Ingestion', to: 'Metadata store', text: 'Session, device, calibration, geometry and version records' },
  { from: 'Raw store', to: 'Processing', text: 'Read only' },
  { from: 'Processing', to: 'Derived store', text: 'Results that name their raw files, software version and settings' },
  { from: 'Derived store', to: 'Heart Twin', text: 'Import of a recording and its metadata' },
];

const C = (id, control, design, poc, test) => ({ id, control, design, poc, test, status: 'Engineering Draft' });
export const controls = [
  C('SC-01', 'Authentication and role-based access', 'Named accounts; roles for developer, director and read-only reviewer; no shared login.', 'Key-based administrator access only; application accounts by role.', 'VT-17'),
  C('SC-02', 'Least privilege', 'Each service account can do only its own job; the ingestion service cannot read back or delete raw files.', 'Separate credentials for write-only ingestion and read-only processing.', 'VT-17'),
  C('SC-03', 'TLS for all communication', 'TLS on every connection; no plain HTTP endpoint.', 'A certificate on the instance; firewall open on the TLS port and the administrator port only, the latter limited to known addresses.', 'VT-16'),
  C('SC-04', 'Encryption at rest', 'Encrypted disks and object storage.', 'To be confirmed for each storage type of the chosen plan before use.', 'VT-16'),
  C('SC-05', 'Device identity and key management', 'A key pair for each device, made on the device; the public key is registered; a retired device\'s key is revoked.', 'A device list with public keys in the metadata store.', 'VT-16'),
  C('SC-06', 'Integrity hashes and provenance', 'A hash of each raw file made at recording and checked at every move; derived data name their inputs.', 'Built in the ingestion service.', 'VT-09'),
  C('SC-07', 'Audit trail', 'Every access and change recorded with account and time, in a store the application cannot rewrite.', 'Append-only log copied off the instance each day.', 'VT-17'),
  C('SC-08', 'Time synchronisation and timestamp checks', 'Device clock checked against the host at the start of a session; the offset is stored; impossible timestamps are rejected.', 'Built in the recording tool and the ingestion service.', 'VT-08'),
  C('SC-09', 'Backups and recovery testing', 'Daily snapshots and a copy of raw files in a second place; a restore is tested, not assumed.', 'Instance snapshots plus object-storage copy; one restore test in T-803.', 'VT-09'),
  C('SC-10', 'Retention and deletion', 'A retention period for each data type; deletion is recorded.', 'Written policy; the proof of concept is deleted at its end date unless the director extends it.', 'Review'),
  C('SC-11', 'Vulnerability and dependency monitoring', 'Automatic alerts for the repositories\' dependencies; operating system updates applied on a schedule.', 'Enabled on the repositories; unattended security updates on the instance.', 'Review'),
  C('SC-12', 'Firmware signing and secure update', 'Images signed with a key kept off the build machine; the device checks the signature before it runs an image; a failed update falls back.', 'Signing in the build; refusal test on the prototype.', 'VT-19'),
  C('SC-13', 'Incident response and decommissioning', 'A one-page procedure: who is told, what is switched off, what is recorded. A retired device or instance is erased and its keys revoked.', 'Written procedure; exercised once on paper.', 'Review'),
  C('SC-14', 'Secrets', 'No key or password in a repository; secret scanning on; keys held in the platform\'s secret store or on the developer\'s machine.', 'Secret scanning enabled on the repositories.', 'Review'),
];

/* The record that ties a result to everything it came from. One row per field group. */
export const dataModel = [
  { entity: 'Device', fields: 'device id, hardware revision, firmware version, public key, state (active or retired)', links: 'Session' },
  { entity: 'Sensor and channel', fields: 'sensor id, type, maker part number, channel id, axis', links: 'Device, Calibration, Geometry' },
  { entity: 'Calibration', fields: 'calibration version, date, method, gain and offset for each channel, the instrument used', links: 'Sensor and channel' },
  { entity: 'Sampling and clock', fields: 'sampling rate, clock source, device and host time at start, offset, sample counter range', links: 'Session' },
  { entity: 'ECG electrode configuration', fields: 'lead definition, electrode positions, electrode type', links: 'Session' },
  { entity: 'Geometry', fields: 'position and direction of each magnetic sensor, the coordinate reference frame and its landmark', links: 'Session, Sensor and channel' },
  { entity: 'Reference channels', fields: 'reference magnetic channels recorded with the heart channels', links: 'Session' },
  { entity: 'Motion and environment', fields: 'motion sensor channels; room condition (still, moving, noisy, shielded, normal); notes', links: 'Session' },
  { entity: 'Session and dataset', fields: 'session id, dataset id, date, operator, purpose, subject type (coil, phantom, synthetic; a person only under decision D-03, and then never by name)', links: 'Raw file' },
  { entity: 'Raw file', fields: 'file id, path, size, hash, time written; never changed after writing', links: 'Session' },
  { entity: 'Processing run', fields: 'algorithm name and version, software version, settings, input file ids and hashes, time', links: 'Raw file, Derived result' },
  { entity: 'Heart Twin model', fields: 'model version and its settings', links: 'Processing run' },
  { entity: 'Derived result', fields: 'features and results, each with the processing run that made it', links: 'Processing run' },
  { entity: 'Quality status', fields: 'checks passed or failed (hash, counters, timestamps, reference tone), reviewer, status', links: 'Session, Derived result' },
];

/* Before any data that identifies a person. A direction, not a design; no service is chosen until that phase is authorised. */
export const futureArchitecture = [
  'A written authorisation for the phase, and the oversight that recordings of people need, come before any build.',
  'A business associate agreement with the cloud provider is in place before any such data is stored or processed.',
  'Only services that the provider lists as eligible under that agreement are used, each set up as the provider requires. The small-instance service used for the proof of concept is not one of them and is not used for this data.',
  'A separate cloud account for this data, apart from the engineering account, with its own administrators.',
  'Private networking: storage and databases have no public address; access goes through an authenticated gateway.',
  'Encryption with keys the company controls, and a record of every use of a key.',
  'Central, tamper-evident logging of every access, kept for the period the retention policy sets.',
  'Identity through single sign-on with a second factor; roles reviewed on a schedule.',
  'Data that identifies a person is kept apart from recordings; recordings carry a study code only.',
  'A risk analysis, staff training and an incident procedure before the first record is stored.',
  'Engineering recordings move across by export with their hashes; nothing in the proof of concept needs to be carried over as it is.',
];

export const migrationReadiness = [
  { item: 'Recording format carries no personal field', state: 'Engineering Draft' },
  { item: 'Hashes and provenance are independent of where files are stored', state: 'Engineering Draft' },
  { item: 'Agreement with the cloud provider', state: 'Not Applicable', note: 'Not needed until data that identifies a person is planned.' },
  { item: 'Separate account and private networking', state: 'Planning Estimate' },
  { item: 'Oversight for recordings of people', state: 'Review Required', note: 'Decision D-03.' },
];
