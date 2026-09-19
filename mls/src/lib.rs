//! Isolated J0 adapter. Not a production FrameUp protocol.
//! Snapshot contains private material: only pass to an encrypted local vault.
use openmls::prelude::*;
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use openmls_traits::OpenMlsProvider;
use serde::{Deserialize as SerdeDeserialize, Serialize as SerdeSerialize};
use tls_codec::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const SUITE: Ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
fn err(e: impl std::fmt::Debug) -> JsError { JsError::new(&format!("{e:?}")) }

#[derive(SerdeSerialize, SerdeDeserialize)]
struct Snapshot {
    format: u32,
    name: String,
    public: Vec<u8>,
    group: Option<Vec<u8>>,
    storage: Vec<(Vec<u8>, Vec<u8>)>,
}

#[wasm_bindgen]
pub struct MlsDevice {
    provider: OpenMlsRustCrypto,
    signer: SignatureKeyPair,
    name: String,
    group: Option<MlsGroup>,
}

#[wasm_bindgen]
impl MlsDevice {
    #[wasm_bindgen(constructor)]
    pub fn new(name: &str) -> Result<Self, JsError> {
        let provider = OpenMlsRustCrypto::default();
        let signer = SignatureKeyPair::new(SignatureScheme::ED25519).map_err(err)?;
        signer.store(provider.storage()).map_err(err)?;
        Ok(Self { provider, signer, name: name.into(), group: None })
    }
    pub fn public_key(&self) -> Vec<u8> { self.signer.public().to_vec() }
    pub fn key_package(&self) -> Result<Vec<u8>, JsError> {
        let credential = self.credential();
        let kp = KeyPackage::builder().build(SUITE, &self.provider, &self.signer, credential).map_err(err)?;
        kp.key_package().tls_serialize_detached().map_err(err)
    }
    pub fn key_package_info(&self, bytes: &[u8]) -> Result<String, JsError> {
        let kp = KeyPackageIn::tls_deserialize_exact(bytes).map_err(err)?
            .validate(self.provider.crypto(), ProtocolVersion::Mls10).map_err(err)?;
        let basic = BasicCredential::try_from(kp.leaf_node().credential().clone()).map_err(err)?;
        Ok(serde_json::json!({"deviceId": String::from_utf8(basic.identity().to_vec()).map_err(err)?,
            "signaturePublic": kp.leaf_node().signature_key().as_slice()}).to_string())
    }
    pub fn create_group(&mut self, id: &str) -> Result<(), JsError> {
        if self.group.is_some() { return Err(JsError::new("GROUP_EXISTS")); }
        self.group = Some(MlsGroup::builder().ciphersuite(SUITE)
            .use_ratchet_tree_extension(true)
            .with_group_id(GroupId::from_slice(id.as_bytes()))
            .build(&self.provider, &self.signer, self.credential()).map_err(err)?);
        Ok(())
    }
    /// Returns TLS commit and Welcome. Durable wrapper saves before releasing them.
    pub fn add(&mut self, key_package: &[u8]) -> Result<String, JsError> {
        let kp = KeyPackageIn::tls_deserialize_exact(key_package).map_err(err)?
            .validate(self.provider.crypto(), ProtocolVersion::Mls10).map_err(err)?;
        let group = self.group.as_mut().ok_or_else(|| JsError::new("NO_GROUP"))?;
        let (commit, welcome, _) = group.add_members(&self.provider, &self.signer, &[kp]).map_err(err)?;
        let output = serde_json::json!({
            "commit": commit.tls_serialize_detached().map_err(err)?,
            "welcome": welcome.tls_serialize_detached().map_err(err)?
        });
        group.merge_pending_commit(&self.provider).map_err(err)?;
        Ok(output.to_string())
    }
    pub fn join(&mut self, bytes: &[u8]) -> Result<(), JsError> {
        if self.group.is_some() { return Err(JsError::new("GROUP_EXISTS")); }
        let message = MlsMessageIn::tls_deserialize_exact(bytes).map_err(err)?;
        let welcome = match message.extract() {
            MlsMessageBodyIn::Welcome(w) => w,
            _ => return Err(JsError::new("EXPECTED_WELCOME"))
        };
        let config = MlsGroupJoinConfig::builder().build();
        self.group = Some(StagedWelcome::new_from_welcome(&self.provider, &config, welcome, None)
            .map_err(err)?.into_group(&self.provider).map_err(err)?);
        Ok(())
    }
    pub fn remove(&mut self, leaf: u32) -> Result<Vec<u8>, JsError> {
        let group = self.group.as_mut().ok_or_else(|| JsError::new("NO_GROUP"))?;
        let (commit, _, _) = group.remove_members(&self.provider, &self.signer, &[LeafNodeIndex::new(leaf)]).map_err(err)?;
        let bytes = commit.tls_serialize_detached().map_err(err)?;
        group.merge_pending_commit(&self.provider).map_err(err)?;
        Ok(bytes)
    }
    pub fn send(&mut self, bytes: &[u8]) -> Result<Vec<u8>, JsError> {
        self.group.as_mut().ok_or_else(|| JsError::new("NO_GROUP"))?
            .create_message(&self.provider, &self.signer, bytes).map_err(err)?
            .tls_serialize_detached().map_err(err)
    }
    pub fn receive(&mut self, bytes: &[u8]) -> Result<String, JsError> {
        let msg = MlsMessageIn::tls_deserialize_exact(bytes).map_err(err)?;
        let protocol = msg.try_into_protocol_message().map_err(err)?;
        let group = self.group.as_mut().ok_or_else(|| JsError::new("NO_GROUP"))?;
        let processed = group.process_message(&self.provider, protocol).map_err(err)?;
        match processed.into_content() {
            ProcessedMessageContent::ApplicationMessage(m) => Ok(serde_json::json!({"kind":"application","bytes":m.into_bytes()}).to_string()),
            ProcessedMessageContent::StagedCommitMessage(s) => {
                group.merge_staged_commit(&self.provider, *s).map_err(err)?;
                Ok("{\"kind\":\"commit\"}".into())
            }
            ProcessedMessageContent::ProposalMessage(p) | ProcessedMessageContent::ExternalJoinProposalMessage(p) => {
                group.store_pending_proposal(self.provider.storage(), *p).map_err(err)?;
                Ok("{\"kind\":\"proposal\"}".into())
            }
            _ => Err(JsError::new("UNSUPPORTED_CONTROL_MESSAGE"))
        }
    }
    pub fn info(&self) -> Result<String, JsError> {
        let g = self.group.as_ref().ok_or_else(|| JsError::new("NO_GROUP"))?;
        let members: Vec<_> = g.members().map(|m| serde_json::json!({"leaf":m.index.u32(),"signaturePublic":m.signature_key})).collect();
        Ok(serde_json::json!({"epoch":g.epoch().as_u64(),"active":g.is_active(),"members":members}).to_string())
    }
    pub fn snapshot(&self) -> Result<String, JsError> {
        let map = self.provider.storage().values.read().map_err(err)?;
        let mut storage: Vec<_> = map.iter().map(|(k,v)|(k.clone(),v.clone())).collect();
        storage.sort_by(|a,b|a.0.cmp(&b.0));
        serde_json::to_string(&Snapshot {format:1, name:self.name.clone(),public:self.public_key(),group:self.group.as_ref().map(|g|g.group_id().as_slice().to_vec()), storage}).map_err(err)
    }
    pub fn restore(serialized: &str) -> Result<MlsDevice, JsError> {
        let data: Snapshot = serde_json::from_str(serialized).map_err(err)?;
        if data.format != 1 {return Err(JsError::new("SNAPSHOT_VERSION"));}
        let provider = OpenMlsRustCrypto::default();
        *provider.storage().values.write().map_err(err)? = data.storage.into_iter().collect();
        let signer = SignatureKeyPair::read(provider.storage(), &data.public, SignatureScheme::ED25519)
            .ok_or_else(|| JsError::new("SIGNER_MISSING"))?;
        let group = match data.group {
            Some(id) => Some(MlsGroup::load(provider.storage(), &GroupId::from_slice(&id)).map_err(err)?
                .ok_or_else(|| JsError::new("GROUP_MISSING"))?),
            None => None
        };
        Ok(MlsDevice {provider, signer, name:data.name, group})
    }
}
impl MlsDevice {
    fn credential(&self) -> CredentialWithKey {
        CredentialWithKey {credential:BasicCredential::new(self.name.as_bytes().to_vec()).into(),signature_key:self.signer.public().into()}
    }
}
