import { renderRoot } from "../core";

function Test2(props: any) {
  return <span>{props.children}</span>;
}

function Test() {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    <div>
      <div>1</div>
      <Test2>
        123333
        <div>123</div>
      </Test2>
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
