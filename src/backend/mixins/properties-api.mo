import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Properties "../types/properties";
import PropertiesLib "../lib/properties";
import RolesLib "../lib/roles";

mixin (
  accessControlState : AccessControl.AccessControlState,
  properties : Map.Map<Text, Properties.PropertyRecord>,
) {
  public query func listProperties(after : ?Text) : async [Properties.PropertyRecord] {
    PropertiesLib.list(properties, after, false);
  };

  public query ({ caller }) func listManagedProperties(after : ?Text) : async [Properties.PropertyRecord] {
    RolesLib.requireAdmin(accessControlState, caller);
    PropertiesLib.list(properties, after, true);
  };

  public shared ({ caller }) func saveProperty(property : Properties.PropertyRecord) : async () {
    RolesLib.requireAdmin(accessControlState, caller);
    PropertiesLib.save(properties, property);
  };
};
